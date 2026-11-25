import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { questionPackSchema } from '@duoquest/shared-types';
import { DomainError } from '@duoquest/game-core';
import starter from '../../../examples/question-pack.json';
import { isLoopbackAddress, resolveClientIp } from '../src/common/client-ip';
import { securityHeadersMiddleware } from '../src/common/security-headers';
import { HealthController } from '../src/modules/health/health.controller';
import { PlayersService } from '../src/modules/players/players.service';
import { QuizPreparationService } from '../src/modules/question-packs/quiz-preparation.service';
import { RewardsService } from '../src/modules/rewards/rewards.service';
import { ROOM_POLICY, RoomsService } from '../src/modules/rooms/rooms.service';
import { GameRegistry } from '../src/modules/sessions/game-registry';
import { SessionsService } from '../src/modules/sessions/sessions.service';
import { AuthGuard } from '../src/modules/auth/auth-guard';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthSessions } from '../src/modules/auth/auth-session.service';
import { MemoryStore } from './memory.store';

describe('Security hardening for Cloudflare Tunnel & Internet exposure', () => {
  describe('resolveClientIp', () => {
    it('ignores CF-Connecting-IP when proxyMode is none', () => {
      expect(resolveClientIp('127.0.0.1', { 'cf-connecting-ip': '203.0.113.10' }, 'none')).toBe(
        '127.0.0.1',
      );
    });

    it('rejects spoofed CF-Connecting-IP from non-loopback peers', () => {
      expect(
        resolveClientIp('192.168.1.50', { 'cf-connecting-ip': '203.0.113.10' }, 'cloudflare'),
      ).toBe('192.168.1.50');
    });

    it('accepts valid IPv4 and IPv6 CF-Connecting-IP from loopback peers in cloudflare mode', () => {
      expect(isLoopbackAddress('127.0.0.1')).toBe(true);
      expect(isLoopbackAddress('::1')).toBe(true);
      expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isLoopbackAddress('10.0.0.2')).toBe(false);

      expect(
        resolveClientIp('127.0.0.1', { 'cf-connecting-ip': '203.0.113.42' }, 'cloudflare'),
      ).toBe('203.0.113.42');
      expect(
        resolveClientIp('::ffff:127.0.0.1', { 'cf-connecting-ip': '2001:db8::1' }, 'cloudflare'),
      ).toBe('2001:db8::1');
    });

    it('falls back to socketAddress when CF-Connecting-IP is invalid', () => {
      expect(resolveClientIp('127.0.0.1', { 'cf-connecting-ip': 'not-an-ip' }, 'cloudflare')).toBe(
        '127.0.0.1',
      );
    });
  });

  describe('securityHeadersMiddleware', () => {
    it('applies required defensive headers and HSTS when secure cookies are enabled', () => {
      const headers = new Map<string, string>();
      const res = {
        setHeader: (key: string, value: string) => {
          headers.set(key.toLowerCase(), value);
        },
      } as unknown as Response;
      const next = vi.fn();
      const prevSecure = process.env.AUTH_COOKIE_SECURE;
      process.env.AUTH_COOKIE_SECURE = 'true';
      try {
        securityHeadersMiddleware({} as Request, res, next);
      } finally {
        if (prevSecure === undefined) delete process.env.AUTH_COOKIE_SECURE;
        else process.env.AUTH_COOKIE_SECURE = prevSecure;
      }

      expect(next).toHaveBeenCalledOnce();
      expect(headers.get('x-content-type-options')).toBe('nosniff');
      expect(headers.get('x-frame-options')).toBe('DENY');
      expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(headers.get('cross-origin-resource-policy')).toBe('same-site');
      expect(headers.get('strict-transport-security')).toContain('max-age=31536000');
    });
  });

  describe('QuestionPack per-owner storage quotas', () => {
    it('enforces max 10 distinct packs and max 30 total versions per owner', async () => {
      const store = new MemoryStore();
      const ownerId = 'owner-1';
      const basePack = questionPackSchema.parse({
        ...starter,
        questions: starter.questions.slice(0, 1),
      });

      for (let i = 1; i <= 10; i++) {
        await store.savePack({ ...basePack, packId: `custom-pack-${i}` }, ownerId);
      }
      await expect(
        store.savePack({ ...basePack, packId: 'custom-pack-11' }, ownerId),
      ).rejects.toMatchObject({ code: 'RATE_LIMITED' });

      // Existing packId can still receive new versions up to 30 total versions
      for (let i = 11; i <= 30; i++) {
        await store.savePack({ ...basePack, packId: 'custom-pack-1' }, ownerId);
      }
      await expect(
        store.savePack({ ...basePack, packId: 'custom-pack-1' }, ownerId),
      ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    });
  });

  describe('RoomsService per-IP active room cap', () => {
    it('caps active rooms per IP without blocking other IPs', async () => {
      const store = new MemoryStore();
      const players = new PlayersService(store);
      const preparation = new QuizPreparationService(store);
      const sessions = new SessionsService(store, new GameRegistry(), new RewardsService());
      const rooms = new RoomsService(players, sessions, preparation);

      try {
        for (let i = 0; i < ROOM_POLICY.maxRoomsPerIp; i++) {
          const guest = await players.create(`Host${i}`);
          const record = await players.authenticate(guest.token);
          await rooms.create(
            record,
            { mode: 'SOLO', layout: 'MULTI_DEVICE', packVersionId: store.pack.id },
            undefined,
            '203.0.113.5',
          );
        }

        const blockedGuest = await players.create('HostBlocked');
        const blockedRecord = await players.authenticate(blockedGuest.token);
        await expect(
          rooms.create(
            blockedRecord,
            { mode: 'SOLO', layout: 'MULTI_DEVICE', packVersionId: store.pack.id },
            undefined,
            '203.0.113.5',
          ),
        ).rejects.toBeInstanceOf(DomainError);

        // Another IP can still create a room
        const otherIpGuest = await players.create('OtherIp');
        const otherIpRecord = await players.authenticate(otherIpGuest.token);
        const created = await rooms.create(
          otherIpRecord,
          { mode: 'SOLO', layout: 'MULTI_DEVICE', packVersionId: store.pack.id },
          undefined,
          '198.51.100.7',
        );
        expect(created.code).toHaveLength(6);
      } finally {
        rooms.onModuleDestroy();
      }
    });
  });

  describe('AuthGuard public HTTPS account auth policy', () => {
    function mockContext(req: Partial<Request> & { headers?: Record<string, string> }) {
      const response = { setHeader: vi.fn() };
      return {
        getType: () => 'http',
        getHandler: () => () => {},
        getClass: () => class {},
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            path: '/api/auth/flow',
            hostname: 'game.example.com',
            socket: { remoteAddress: '127.0.0.1' },
            headers: {},
            ...req,
          }),
          getResponse: () => response,
        }),
      } as unknown as ExecutionContext;
    }

    it('blocks non-localhost account auth when ALLOW_PUBLIC_ACCOUNT_AUTH is false', async () => {
      const reflector = {
        getAllAndOverride: vi.fn((key: string) => (key === 'dq:local-account' ? true : 'public')),
      } as unknown as Reflector;
      const sessions = { resolve: vi.fn().mockResolvedValue(null) } as unknown as AuthSessions;
      const guard = new AuthGuard(reflector, sessions);

      const prevAllow = process.env.ALLOW_PUBLIC_ACCOUNT_AUTH;
      process.env.ALLOW_PUBLIC_ACCOUNT_AUTH = 'false';
      try {
        await expect(
          guard.canActivate(mockContext({ hostname: 'game.example.com' })),
        ).rejects.toMatchObject({ status: 403 });
      } finally {
        if (prevAllow === undefined) delete process.env.ALLOW_PUBLIC_ACCOUNT_AUTH;
        else process.env.ALLOW_PUBLIC_ACCOUNT_AUTH = prevAllow;
      }
    });

    it('allows matching HTTPS AUTH_WEB_ORIGIN when ALLOW_PUBLIC_ACCOUNT_AUTH is true', async () => {
      const reflector = {
        getAllAndOverride: vi.fn((key: string) => (key === 'dq:local-account' ? true : 'public')),
      } as unknown as Reflector;
      const sessions = { resolve: vi.fn().mockResolvedValue(null) } as unknown as AuthSessions;
      const guard = new AuthGuard(reflector, sessions);

      const prevAllow = process.env.ALLOW_PUBLIC_ACCOUNT_AUTH;
      const prevOrigin = process.env.AUTH_WEB_ORIGIN;
      process.env.ALLOW_PUBLIC_ACCOUNT_AUTH = 'true';
      process.env.AUTH_WEB_ORIGIN = 'https://game.example.com';
      try {
        await expect(
          guard.canActivate(
            mockContext({
              hostname: 'game.example.com',
              headers: { origin: 'https://game.example.com' },
            }),
          ),
        ).resolves.toBe(true);

        await expect(
          guard.canActivate(
            mockContext({
              hostname: 'game.example.com',
              headers: { origin: 'https://evil.example.com' },
            }),
          ),
        ).rejects.toMatchObject({ status: 403 });
      } finally {
        if (prevAllow === undefined) delete process.env.ALLOW_PUBLIC_ACCOUNT_AUTH;
        else process.env.ALLOW_PUBLIC_ACCOUNT_AUTH = prevAllow;
        if (prevOrigin === undefined) delete process.env.AUTH_WEB_ORIGIN;
        else process.env.AUTH_WEB_ORIGIN = prevOrigin;
      }
    });
  });

  describe('HealthController readiness caching', () => {
    it('caches healthy DB check for 3s to prevent DB query flooding', async () => {
      const queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
      const controller = new HealthController({ $queryRaw: queryRaw } as never);
      expect(await controller.ready()).toEqual({ status: 'ok', database: 'up' });
      expect(await controller.ready()).toEqual({ status: 'ok', database: 'up' });
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });
  });
});
