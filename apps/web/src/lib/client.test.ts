import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, SocketError, api, request } from './client';

describe('web client error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('converts non-JSON 502 responses into ApiError without throwing SyntaxError', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html><body>502 Bad Gateway</body></html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html', 'X-Request-Id': 'req-502-abc' },
        }),
      ),
    );

    await expect(api('/players/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      code: 'INTERNAL',
      requestId: 'req-502-abc',
    });
  });

  it('preserves status, code, message, and requestId from structured API errors', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'NOT_FOUND', message: 'Không tìm thấy tài nguyên.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'req-404-xyz' },
        }),
      ),
    );

    try {
      await api('/missing');
      expect.unreachable('should have thrown ApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài nguyên.',
        requestId: 'req-404-xyz',
      });
    }
  });

  it('preserves socket ACK error code via SocketError', async () => {
    try {
      await request((ack) =>
        ack({ ok: false, error: { code: 'TOO_LATE', message: 'Hết giờ trả lời' } }),
      );
      expect.unreachable('should have thrown SocketError');
    } catch (error) {
      expect(error).toBeInstanceOf(SocketError);
      expect(error).toMatchObject({
        code: 'TOO_LATE',
        message: 'Hết giờ trả lời',
      });
    }
  });
});
