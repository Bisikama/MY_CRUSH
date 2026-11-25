import { isIP } from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';
import { env } from './config';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isLoopbackAddress(address: string | undefined | null): boolean {
  return !!address && LOOPBACK_ADDRESSES.has(address);
}

/**
 * Resolve the client IP safely. Only trusts `CF-Connecting-IP` when
 * `TRUST_PROXY_MODE=cloudflare` AND the TCP peer is loopback (local cloudflared),
 * preventing direct-client IP spoofing.
 */
export function resolveClientIp(
  socketAddress: string | undefined,
  headers: IncomingHttpHeaders,
  proxyMode: 'none' | 'cloudflare' = env.TRUST_PROXY_MODE,
): string {
  if (proxyMode === 'cloudflare' && isLoopbackAddress(socketAddress)) {
    const raw = headers['cf-connecting-ip'];
    const candidate = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (candidate && isIP(candidate) !== 0) {
      return candidate;
    }
  }
  return socketAddress || 'unknown';
}
