import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import {
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  type ArgumentsHost,
} from '@nestjs/common';
import { DomainError } from '@duoquest/game-core';
import { z } from 'zod';
import {
  formatZodError,
  httpStatusToErrorCode,
  serializeErrorForLog,
} from '../src/common/error-utils';
import { HttpErrorFilter } from '../src/common/http-error.filter';
import { MailService } from '../src/modules/auth/mail.service';

function createMockHost(headers: Record<string, string> = {}) {
  const responseHeaders = new Map<string, string>();
  let statusCode = 200;
  let jsonBody: unknown;
  const request = {
    method: 'POST',
    originalUrl: '/api/test-endpoint',
    headers,
    principal: { playerId: 'player-123' },
  };
  const response = {
    headersSent: false,
    setHeader: vi.fn((key: string, value: string) => {
      responseHeaders.set(key.toLowerCase(), value);
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return response;
    }),
    json: vi.fn((body: unknown) => {
      jsonBody = body;
      return response;
    }),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return {
    host,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
    getHeader: (name: string) => responseHeaders.get(name.toLowerCase()),
  };
}

describe('error-utils and HttpErrorFilter', () => {
  it('formats ZodError with nested paths and root messages', () => {
    const schema = z.object({ sessionId: z.string().uuid() });
    const parsed = schema.safeParse({ sessionId: 'bad' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(formatZodError(parsed.error)).toContain('sessionId:');
    }
  });

  it('maps HTTP statuses to semantic error codes', () => {
    expect(httpStatusToErrorCode(404)).toBe('NOT_FOUND');
    expect(httpStatusToErrorCode(413)).toBe('PAYLOAD_TOO_LARGE');
    expect(httpStatusToErrorCode(429)).toBe('RATE_LIMITED');
    expect(httpStatusToErrorCode(503)).toBe('SERVICE_UNAVAILABLE');
    expect(httpStatusToErrorCode(502)).toBe('INTERNAL');
  });

  it('serializes nested causes safely for server logs', () => {
    const root = new Error('connection refused');
    const wrapped = new DomainError('INTERNAL', 'Lỗi nội bộ', { cause: root });
    const serialized = serializeErrorForLog(wrapped);
    expect(serialized.name).toBe('DomainError');
    expect(serialized.code).toBe('INTERNAL');
    expect((serialized.cause as Record<string, unknown>).message).toBe('connection refused');
  });

  it('never leaks raw 404 route or internal 500 details to the client and attaches X-Request-Id', () => {
    const filter = new HttpErrorFilter();
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const debugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    try {
      const notFoundCtx = createMockHost({ 'x-request-id': 'req-trace-12345' });
      filter.catch(new NotFoundException('Cannot GET /api/internal/secret'), notFoundCtx.host);
      expect(notFoundCtx.getStatus()).toBe(404);
      expect(notFoundCtx.getBody()).toEqual({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài nguyên.',
      });
      expect(notFoundCtx.getHeader('x-request-id')).toBe('req-trace-12345');

      const internalCtx = createMockHost();
      filter.catch(new Error('SELECT * FROM secret_table failed'), internalCtx.host);
      expect(internalCtx.getStatus()).toBe(500);
      expect(internalCtx.getBody()).toEqual({
        code: 'INTERNAL',
        message: 'Không thể hoàn thành yêu cầu. Kiểm tra API/database rồi thử lại.',
      });
      expect(JSON.stringify(internalCtx.getBody())).not.toContain('secret_table');
      expect(internalCtx.getHeader('x-request-id')).toBeTruthy();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(String(errorSpy.mock.calls[0]?.[0])).toContain('secret_table');
      expect(String(errorSpy.mock.calls[0]?.[0])).toContain('player-123');
    } finally {
      errorSpy.mockRestore();
      debugSpy.mockRestore();
    }
  });

  it('maps ServiceUnavailableException and raw InternalServerErrorException without leaking details', () => {
    const filter = new HttpErrorFilter();
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      const readyCtx = createMockHost();
      filter.catch(
        new ServiceUnavailableException({
          code: 'SERVICE_UNAVAILABLE',
          message: 'PostgreSQL chưa sẵn sàng',
        }),
        readyCtx.host,
      );
      expect(readyCtx.getStatus()).toBe(503);
      expect(readyCtx.getBody()).toEqual({
        code: 'SERVICE_UNAVAILABLE',
        message: 'PostgreSQL chưa sẵn sàng',
      });

      const raw500Ctx = createMockHost();
      filter.catch(new InternalServerErrorException('Sensitive DB host 10.0.0.5'), raw500Ctx.host);
      expect(raw500Ctx.getStatus()).toBe(500);
      expect(raw500Ctx.getBody()).toEqual({
        code: 'INTERNAL',
        message: 'Không thể hoàn thành yêu cầu. Kiểm tra API/database rồi thử lại.',
      });
      expect(JSON.stringify(raw500Ctx.getBody())).not.toContain('10.0.0.5');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('maps Express JSON syntax and payload-too-large errors cleanly', () => {
    const filter = new HttpErrorFilter();
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      const parseErr = Object.assign(new SyntaxError('Unexpected token }'), {
        type: 'entity.parse.failed',
      });
      const parseCtx = createMockHost();
      filter.catch(parseErr, parseCtx.host);
      expect(parseCtx.getStatus()).toBe(400);
      expect(parseCtx.getBody()).toEqual({
        code: 'INVALID_INPUT',
        message: 'Dữ liệu JSON không hợp lệ.',
      });

      const largeErr = Object.assign(new Error('request entity too large'), {
        type: 'entity.too.large',
      });
      const largeCtx = createMockHost();
      filter.catch(largeErr, largeCtx.host);
      expect(largeCtx.getStatus()).toBe(413);
      expect(largeCtx.getBody()).toEqual({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Dữ liệu gửi lên vượt quá giới hạn cho phép.',
      });
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('preserves structured auth HttpException responses', () => {
    const filter = new HttpErrorFilter();
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      const ctx = createMockHost();
      filter.catch(
        new HttpException({ code: 'CSRF_INVALID', message: 'Yêu cầu không khớp phiên.' }, 403),
        ctx.host,
      );
      expect(ctx.getStatus()).toBe(403);
      expect(ctx.getBody()).toEqual({
        code: 'CSRF_INVALID',
        message: 'Yêu cầu không khớp phiên.',
      });
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('logs a warning without leaking OTP content when MailService is unconfigured', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    try {
      const service = new MailService();
      const outcome = await service.send('user@example.com', 'OTP', 'Secret OTP 999888');
      expect(outcome).toBe('rejected');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      const logged = String(warnSpy.mock.calls[0]?.[0]);
      expect(logged).toContain('smtp_unconfigured');
      expect(logged).not.toContain('999888');
      expect(logged).not.toContain('user@example.com');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
