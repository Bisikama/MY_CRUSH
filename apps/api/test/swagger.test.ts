import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/common/swagger';
import { HttpErrorFilter } from '../src/common/http-error.filter';
import { PlatformStore } from '../src/modules/persistence/store';
import { PrismaService } from '../src/modules/persistence/prisma.service';
import { MemoryStore } from './memory.store';

describe('Swagger REST documentation and bearer workflow', () => {
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
    await app?.close();
  });

  it('serves the UI, local assets and OpenAPI JSON', async () => {
    const ui = await fetch(`${origin}/api/docs`);
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain('Swagger UI');
    const asset = await fetch(`${origin}/api/docs/swagger-ui-bundle.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
    const json = await fetch(`${origin}/api/docs-json`);
    expect(json.status).toBe(200);
    expect(await json.json()).toEqual(document);
  });

  it('documents all 12 REST operations with correct auth, schemas and status codes', () => {
    const publicOperations = new Set([
      'post /api/players/guest',
      'get /api/shop/items',
      'get /api/health',
      'get /api/health/ready',
    ]);
    let count = 0;
    for (const [path, item] of Object.entries(document.paths)) {
      for (const method of ['get', 'post'] as const) {
        const operation = item[method];
        if (!operation) continue;
        count++;
        expect(operation.summary).toBeTruthy();
        expect(operation.security ?? []).toEqual(
          publicOperations.has(`${method} ${path}`) ? [] : [{ 'guest-token': [] }],
        );
        expect(operation.responses[method === 'post' ? '201' : '200']).toBeDefined();
        if (method === 'post')
          expect(operation.requestBody).toHaveProperty('content.application/json.schema');
      }
    }
    expect(count).toBe(12);
    expect(document.components?.securitySchemes?.['guest-token']).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    const text = JSON.stringify(document);
    expect(text).toContain('correctOptionId'); // Only the authored pack contract, never a live game snapshot.
    expect(text).not.toContain('tokenHash');
    expect(text).not.toContain('#/definitions/');
    expect(document.paths['/api/shop/purchases']?.post?.responses['409']).toBeDefined();
  });

  it('keeps guest creation validation and protected profile authorization working', async () => {
    const invalid = await fetch(`${origin}/api/players/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'x' }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: 'INVALID_INPUT' });
    const unauthorized = await fetch(`${origin}/api/players/me`);
    expect(unauthorized.status).toBe(401);
    const created = await fetch(`${origin}/api/players/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: 'Swagger Guest' }),
    });
    expect(created.status).toBe(201);
    const guest = (await created.json()) as { token: string; playerId: string };
    const profile = await fetch(`${origin}/api/players/me`, {
      headers: { Authorization: `Bearer ${guest.token}` },
    });
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({ id: guest.playerId });
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
});
