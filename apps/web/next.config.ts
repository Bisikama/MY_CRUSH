import { readFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

function readRootEnv(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envText = readFileSync(resolve(process.cwd(), '../../.env'), 'utf8');
    const match = new RegExp(`^${key}=(.+)$`, 'm').exec(envText);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, '');
  } catch {
    // Ignore if root .env is absent
  }
  return '';
}

function collectAllowedDevOrigins(): string[] {
  const hosts = new Set<string>(['127.0.0.1', 'localhost']);

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && entry.address) {
        hosts.add(entry.address);
      }
    }
  }

  const webOrigins = readRootEnv('WEB_ORIGINS');

  for (const raw of webOrigins.split(',')) {
    const trimmed = raw.trim().replace(/^["']|["']$/g, '');
    if (!trimmed) continue;
    try {
      hosts.add(new URL(trimmed).hostname.toLowerCase());
    } catch {
      hosts.add(trimmed.toLowerCase());
    }
  }

  return [...hosts];
}

function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const cdnOrigins = readRootEnv('QUIZ_IMAGE_CDN_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.startsWith('https://'));

  const connectSources = new Set<string>(["'self'", 'wss:']);
  if (isDev) {
    connectSources.add('ws:');
    connectSources.add('http:');
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl);
      connectSources.add(parsed.origin);
      connectSources.add(`${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}`);
    } catch {
      // Ignore invalid NEXT_PUBLIC_API_URL
    }
  } else {
    connectSources.add('http://localhost:4000');
    connectSources.add('http://127.0.0.1:4000');
    connectSources.add('ws://localhost:4000');
    connectSources.add('ws://127.0.0.1:4000');
  }

  const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  const imgSrc = ["'self'", 'data:', 'blob:', ...cdnOrigins].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "media-src 'self' blob:",
    "font-src 'self' data:",
    `connect-src ${[...connectSources].join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@duoquest/shared-types', '@duoquest/ui'],
  allowedDevOrigins: collectAllowedDevOrigins(),
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: buildContentSecurityPolicy() },
    ];
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default config;
