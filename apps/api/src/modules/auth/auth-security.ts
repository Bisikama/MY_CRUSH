import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';

export const SESSION_COOKIE = 'dq_session';
const FLOW_COOKIE = 'dq_flow';
const flowSeconds = 1800;
export const DAY = 86_400_000;
export const secret = process.env.AUTH_SECRET
  ? Buffer.from(process.env.AUTH_SECRET, 'base64url')
  : randomBytes(32);
const secure = process.env.NODE_ENV === 'production' || process.env.AUTH_COOKIE_SECURE === 'true';
if (
  (process.env.AUTH_SECRET && secret.length < 32) ||
  (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET)
)
  throw new Error('AUTH_SECRET phải là ít nhất 32 byte, mã hóa base64url.');

export const token = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const mac = (purpose: string, ...parts: (string | number)[]) =>
  createHmac('sha256', secret)
    .update(JSON.stringify([purpose, ...parts]))
    .digest('base64url');
export function equal(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const emailSchema = z.string().trim().max(254).email().toLowerCase();
export const passwordSchema = z
  .string()
  .max(256)
  .refine((value) => {
    const length = Array.from(value).length;
    return length >= 15 && length <= 128;
  }, 'Mật khẩu phải dài 15–128 ký tự.');

export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}

export function readCookie(header: string | undefined, name: string) {
  const matches = (header ?? '')
    .split(';')
    .map((value) => value.trim())
    .filter((value) => value.startsWith(name + '='));
  return matches.length === 1 ? matches[0]?.slice(name.length + 1) : undefined;
}

const cookieOptions = { httpOnly: true, secure, sameSite: 'lax', path: '/' } as const;
export function sessionCookie(response: Response, value?: string) {
  response.setHeader('Cache-Control', 'no-store');
  if (value) response.cookie(SESSION_COOKIE, value, { ...cookieOptions, maxAge: 30 * DAY });
  else response.clearCookie(SESSION_COOKIE, cookieOptions);
}

export function flowNonce(request: Request, response?: Response) {
  const value = readCookie(request.headers.cookie, FLOW_COOKIE);
  if (value) {
    const [nonce, time, signature, extra] = value.split('.');
    if (
      nonce &&
      time &&
      signature &&
      !extra &&
      tokenSchema.safeParse(nonce).success &&
      Number(time) > Date.now() &&
      equal(signature, mac('flow-cookie', nonce, time))
    )
      return nonce;
  }
  if (!response) return undefined;
  const nonce = token();
  const expires = String(Date.now() + flowSeconds * 1000);
  response.cookie(FLOW_COOKIE, [nonce, expires, mac('flow-cookie', nonce, expires)].join('.'), {
    ...cookieOptions,
    maxAge: flowSeconds * 1000,
  });
  return nonce;
}

export function clearFlow(response: Response) {
  response.clearCookie(FLOW_COOKIE, cookieOptions);
}
