import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/common/swagger';
import { HttpErrorFilter } from '../src/common/http-error.filter';
import { AuthSessions } from '../src/modules/auth/auth-session.service';
import { PlatformStore } from '../src/modules/persistence/store';
import { PrismaService } from '../src/modules/persistence/prisma.service';
import { PlayersService } from '../src/modules/players/players.service';
import { RoomsService } from '../src/modules/rooms/rooms.service';
import { MemoryStore } from './memory.store';

describe('Swagger REST documentation and cookie workflow', () => {
  let app: INestApplication;
  let origin: string;
  let document: OpenAPIObject;
  const database = { $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PlatformStore)
      .useValue(new MemoryStore())
      .overrideProvider(PrismaService)
      .useValue(database)
      .compile();
    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpErrorFilter());
    document = setupSwagger(app);
    await app.listen(0, '127.0.0.1');
    origin = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    app?.getHttpServer().closeAllConnections();
    await app?.close();
  });

  it('serves the UI, local assets and OpenAPI JSON', async () => {
    const ui = await fetch(`${origin}/api/docs`);
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain('Swagger UI');
    const asset = await fetch(`${origin}/api/docs/swagger-ui-bundle.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
    await asset.arrayBuffer();
    const json = await fetch(`${origin}/api/docs-json`);
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual(document);
  });

  it('documents all 13 REST operations with correct auth, schemas and status codes', () => {
    const publicOperations = new Set([
      'post /api/players/guest',
      'get /api/shop/items',
      'get /api/health',
      'get /api/health/ready',
    ]);
    let count = 0;
    for (const [path, item] of Object.entries(document.paths)) {
      if (path.startsWith('/api/auth/')) continue;
      for (const method of ['get', 'post'] as const) {
        const operation = item[method];
        if (!operation) continue;
        count++;
        expect(operation.summary).toBeTruthy();
        expect(operation.security ?? []).toEqual(
          publicOperations.has(`${method} ${path}`) ? [] : [{ 'session-cookie': [] }],
        );
        expect(operation.responses[method === 'post' ? '201' : '200']).toBeDefined();
        if (method === 'post')
          expect(operation.requestBody).toHaveProperty('content.application/json.schema');
      }
    }
    expect(count).toBe(13);
    expect(document.paths['/api/rooms/current']?.get).toBeDefined();
    expect(document.components?.securitySchemes?.['session-cookie']).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'dq_session',
    });
    const text = JSON.stringify(document);
    expect(text).toContain('correctOptionId'); // Only the authored pack contract, never a live game snapshot.
    expect(text).not.toContain('tokenHash');
    expect(text).not.toContain('#/definitions/');
    expect(document.paths['/api/shop/purchases']?.post?.responses['409']).toBeDefined();
  });

  it('serves CSRF without a DB session and rejects unauthenticated profile and current room', async () => {
    const csrf = await fetch(origin + '/api/auth/csrf');
    expect(csrf.status).toBe(200);
    expect(csrf.headers.get('set-cookie')).toContain('dq_flow=');
    expect(await csrf.json()).toHaveProperty('csrfToken');
    expect((await fetch(origin + '/api/players/me')).status).toBe(401);
    expect((await fetch(origin + '/api/rooms/current')).status).toBe(401);
    const forged = await fetch(origin + '/api/players/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      body: JSON.stringify({ nickname: 'Swagger Guest' }),
    });
    expect(forged.status).toBe(403);
    expect(await forged.json()).toMatchObject({ code: 'CSRF_INVALID' });
  });

  it('documents and preserves the readiness failure response', async () => {
    database.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));
    const response = await fetch(`${origin}/api/health/ready`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'INVALID_INPUT',
      message: 'PostgreSQL chưa sẵn sàng',
    });
  });

  it('serves the current room only to its authenticated controller with no-store caching', async () => {
    const players = app.get(PlayersService);
    const rooms = app.get(RoomsService);
    const sessions = app.get(AuthSessions);
    const store = app.get(PlatformStore) as MemoryStore;
    const hostIdentity = await players.create('RoomHost');
    const hostRecord = await players.authenticate(hostIdentity.token);
    const outsiderIdentity = await players.create('Outsider');
    const outsiderRecord = await players.authenticate(outsiderIdentity.token);

    const resolveSpy = vi.spyOn(sessions, 'resolve').mockImplementation(async (cookie) => {
      if (cookie === 'host-cookie') {
        return {
          sessionId: 'sess-host',
          playerId: hostRecord.id,
          nickname: hostRecord.nickname,
          accountId: null,
          email: null,
          role: null,
          validUntil: Date.now() + 60_000,
        };
      }
      if (cookie === 'outsider-cookie') {
        return {
          sessionId: 'sess-outsider',
          playerId: outsiderRecord.id,
          nickname: outsiderRecord.nickname,
          accountId: null,
          email: null,
          role: null,
          validUntil: Date.now() + 60_000,
        };
      }
      return null;
    });

    try {
      const created = await rooms.create(hostRecord, {
        mode: 'SOLO',
        layout: 'MULTI_DEVICE',
        packVersionId: store.pack.id,
      });

      const hostRes = await fetch(`${origin}/api/rooms/current?playerId=${outsiderRecord.id}`, {
        headers: { Cookie: 'dq_session=host-cookie' },
      });
      expect(hostRes.status).toBe(200);
      expect(hostRes.headers.get('cache-control')).toBe('no-store');
      expect(await hostRes.json()).toEqual({
        room: { code: created.code, gameId: 'quiz', status: 'WAITING' },
      });

      const outsiderRes = await fetch(`${origin}/api/rooms/current?playerId=${hostRecord.id}`, {
        headers: { Cookie: 'dq_session=outsider-cookie' },
      });
      expect(outsiderRes.status).toBe(200);
      expect(await outsiderRes.json()).toEqual({ room: null });

      await rooms.leave(created.code, hostRecord.id);
      const afterLeaveRes = await fetch(`${origin}/api/rooms/current`, {
        headers: { Cookie: 'dq_session=host-cookie' },
      });
      expect(await afterLeaveRes.json()).toEqual({ room: null });
    } finally {
      resolveSpy.mockRestore();
    }
  });
});
