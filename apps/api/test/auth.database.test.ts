import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/common/http-error.filter';
import { Roles } from '../src/modules/auth/auth-guard';
import { digest } from '../src/modules/auth/auth-security';
import { MailService } from '../src/modules/auth/mail.service';
import { PlatformStore } from '../src/modules/persistence/store';
import { PrismaService } from '../src/modules/persistence/prisma.service';

@Controller('test-admin')
class AdminFixture {
  @Roles('ADMIN')
  @Get()
  check() {
    return { allowed: true };
  }
}
@Module({ imports: [AppModule], controllers: [AdminFixture] })
class TestRoot {}

const webOrigin = 'http://localhost:3000';
const password = 'A test passphrase with spaces!';
const nextPassword = 'A new test passphrase with spaces!';

class Browser {
  private readonly cookies = new Map<string, string>();
  constructor(private readonly base: string) {}
  cookieHeader() {
    return [...this.cookies].map(([name, value]) => name + '=' + value).join('; ');
  }
  async request(path: string, body?: unknown, origin = webOrigin, acceptCookies = true) {
    let csrf: string | undefined;
    if (body !== undefined)
      csrf = (
        (await (await this.fetch('/auth/csrf', undefined, webOrigin)).json()) as {
          csrfToken: string;
        }
      ).csrfToken;
    return this.fetch(path, body, origin, csrf, acceptCookies);
  }
  private async fetch(
    path: string,
    body: unknown,
    origin: string,
    csrf?: string,
    acceptCookies = true,
  ) {
    const response = await fetch(this.base + '/api' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Origin: origin,
        Cookie: this.cookieHeader(),
        ...(csrf ? { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const header of acceptCookies ? response.headers.getSetCookie() : []) {
      const pair = header.split(';')[0]!;
      const split = pair.indexOf('=');
      const name = pair.slice(0, split);
      const value = pair.slice(split + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    return response;
  }
}

describe.skipIf(process.env.RUN_DB_TESTS !== '1')('Auth with PostgreSQL and Socket.IO', () => {
  let app: INestApplication;
  let db: PrismaService;
  let base: string;
  const mail = new Map<string, string>();
  const testEmails = new Set<string>();
  const players = new Set<string>();
  const mailSend = vi.fn(async (email: string, _subject: string, message: string) => {
    const code = /\b[0-9]{6}\b/.exec(message)?.[0];
    if (code) mail.set(email, code);
    return 'accepted';
  });

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test'))
      throw new Error('Auth integration requires a database ending in _test.');
    const module = await Test.createTestingModule({ imports: [TestRoot] })
      .overrideProvider(MailService)
      .useValue({ send: mailSend })
      .compile();
    app = module.createNestApplication({ logger: false });
    vi.spyOn(app.get(PlatformStore), 'cancelInterruptedSessions').mockResolvedValue(undefined);
    db = app.get(PrismaService);
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpErrorFilter());
    await app.listen(0, '127.0.0.1');
    base = 'http://127.0.0.1:' + (app.getHttpServer().address() as AddressInfo).port;
  });

  afterAll(async () => {
    if (db) {
      const ids = [...players];
      await db.emailChallenge.deleteMany({ where: { email: { in: [...testEmails] } } });
      await db.authSession.deleteMany({ where: { playerId: { in: ids } } });
      await db.account.deleteMany({ where: { playerId: { in: ids } } });
      await db.wallet.deleteMany({ where: { playerId: { in: ids } } });
      await db.player.deleteMany({ where: { id: { in: ids } } });
    }
    await app?.close();
  });

  it('migrates guest, requires OTP, upgrades the same player and enforces roles', async () => {
    const browser = new Browser(base);
    const other = new Browser(base);
    const legacy = randomUUID().replace(/-/g, '').padEnd(43, 'a');
    const player = await db.player.create({
      data: {
        nickname: 'Guest original',
        tokenHash: digest(legacy),
        xp: 23,
        wallet: { create: { balance: 120 } },
      },
    });
    players.add(player.id);
    const email = randomUUID() + '@example.test';
    testEmails.add(email);
    const baseline = await db.authSession.count();
    await Promise.all(Array.from({ length: 100 }, () => fetch(base + '/api/auth/csrf')));
    expect(await db.authSession.count()).toBe(baseline);
    expect(
      (await browser.request('/auth/guest/migrate', { token: legacy }, webOrigin, false)).status,
    ).toBe(201);
    expect((await browser.request('/auth/guest/migrate', { token: legacy })).status).toBe(201);
    expect(await db.authSession.count({ where: { playerId: player.id } })).toBe(1);
    expect((await other.request('/auth/guest/migrate', { token: legacy })).status).toBe(401);
    expect((await browser.request('/test-admin')).status).toBe(403);
    expect(
      (await browser.request('/auth/register/start', { email }, 'http://untrusted.example')).status,
    ).toBe(403);
    const start = await browser.request('/auth/register/start', { email });
    expect(start.status).toBe(201);
    const { challengeId } = (await start.json()) as { challengeId: string };
    const account = { challengeId, nickname: 'Guest upgraded', password };
    expect((await browser.request('/auth/register/complete', account)).status).toBe(400);
    const code = mail.get(email)!;
    expect(code).toMatch(/^\d{6}$/);
    expect((await other.request('/auth/register/verify', { challengeId, code })).status).toBe(400);
    expect((await browser.request('/auth/register/verify', { challengeId, code })).status).toBe(
      201,
    );
    expect((await browser.request('/auth/register/complete', account)).status).toBe(201);
    expect(await (await browser.request('/auth/me')).json()).toMatchObject({
      kind: 'account',
      playerId: player.id,
      role: 'PLAYER',
    });
    expect(await (await browser.request('/players/me')).json()).toMatchObject({
      xp: 23,
      wallet: { balance: 120 },
    });
    expect((await browser.request('/auth/register/complete', account)).status).toBe(409);
    expect((await browser.request('/test-admin')).status).toBe(403);
    await db.account.update({ where: { email }, data: { role: 'ADMIN' } });
    expect((await browser.request('/test-admin')).status).toBe(200);
    expect((await other.request('/auth/register/start', { email })).status).toBe(409);

    const login = new Browser(base);
    expect((await login.request('/auth/login', { email, password })).status).toBe(201);
    const socket = io(base, {
      transports: ['websocket'],
      reconnection: false,
      autoConnect: false,
      extraHeaders: { Origin: webOrigin, Cookie: login.cookieHeader() },
    });
    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve);
        socket.once('connect_error', reject);
        socket.connect();
      });
      const disconnected = new Promise<void>((resolve) =>
        socket.once('disconnect', () => resolve()),
      );
      expect(
        (
          await browser.request('/auth/password/change', {
            currentPassword: password,
            password: nextPassword,
          })
        ).status,
      ).toBe(201);
      await disconnected;
      expect((await login.request('/players/me')).status).toBe(401);
      expect((await browser.request('/players/me')).status).toBe(200);
    } finally {
      socket.disconnect();
    }

    const reset = await other.request('/auth/password-reset/start', { email });
    expect(reset.status).toBe(201);
    const { challengeId: resetId } = (await reset.json()) as { challengeId: string };
    expect(
      (
        await other.request('/auth/password-reset/verify', {
          challengeId: resetId,
          code: mail.get(email),
        })
      ).status,
    ).toBe(201);
    expect(
      (await other.request('/auth/password-reset/complete', { challengeId: resetId, password }))
        .status,
    ).toBe(201);
    expect((await browser.request('/players/me')).status).toBe(401);
    expect((await other.request('/auth/login', { email, password })).status).toBe(201);
    expect((await other.request('/auth/logout-all', {})).status).toBe(201);
    expect((await other.request('/players/me')).status).toBe(401);
  }, 30_000);

  it('releases mail quota on rejection, keeps uncertain reservations and rotates a resent code', async () => {
    const browser = new Browser(base);
    const email = randomUUID() + '@example.test';
    testEmails.add(email);
    mailSend.mockResolvedValueOnce('rejected');
    expect((await browser.request('/auth/register/start', { email })).status).toBe(503);
    const stored = await db.emailChallenge.findFirstOrThrow({ where: { email } });
    expect(stored.digest).toBeNull();
    const { mac } = await import('../src/modules/auth/auth-security');
    const quota = () =>
      db.authRateLimit.findUniqueOrThrow({
        where: { key: mac('rate-limit', 'mail-recipient', email) },
      });
    expect((await quota()).count).toBe(0);
    const past = new Date(Date.now() - 61_000);
    const allowResend = () =>
      db.emailChallenge.update({ where: { id: stored.id }, data: { lastSentAt: past } });
    await allowResend();
    mailSend.mockResolvedValueOnce('unknown');
    expect(
      (await browser.request('/auth/register/resend', { challengeId: stored.id })).status,
    ).toBe(503);
    expect((await quota()).count).toBe(1);
    await allowResend();
    expect(
      (await browser.request('/auth/register/resend', { challengeId: stored.id })).status,
    ).toBe(201);
    const original = mail.get(email)!;
    const wrong = original === '000000' ? '111111' : '000000';
    expect(
      (await browser.request('/auth/register/verify', { challengeId: stored.id, code: wrong }))
        .status,
    ).toBe(400);
    await allowResend();
    expect(
      (await browser.request('/auth/register/resend', { challengeId: stored.id })).status,
    ).toBe(201);
    expect((await db.emailChallenge.findUniqueOrThrow({ where: { id: stored.id } })).attempts).toBe(
      1,
    );
    expect(
      (await browser.request('/auth/register/verify', { challengeId: stored.id, code: original }))
        .status,
    ).toBe(400);
    expect(
      (
        await browser.request('/auth/register/verify', {
          challengeId: stored.id,
          code: mail.get(email),
        })
      ).status,
    ).toBe(201);
  }, 20_000);
});
