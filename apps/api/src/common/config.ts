import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const booleanEnv = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0', ''])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return defaultValue;
      return value === 'true' || value === '1';
    });

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z
  .object({
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_HOST: z.string().default('0.0.0.0'),
    WEB_ORIGINS: z.string().default('http://localhost:3000,http://127.0.0.1:3000'),
    TRUST_PROXY_MODE: z.enum(['none', 'cloudflare']).default('none'),
    ENABLE_SWAGGER: booleanEnv(!isProduction),
    ALLOW_PUBLIC_ACCOUNT_AUTH: booleanEnv(false),
    AUTH_WEB_ORIGIN: z.string().trim().default('http://localhost:3000'),
  })
  .superRefine((data, ctx) => {
    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(data.AUTH_WEB_ORIGIN);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_WEB_ORIGIN'],
        message: 'AUTH_WEB_ORIGIN phải là một URL origin hợp lệ.',
      });
      return;
    }
    if (data.ALLOW_PUBLIC_ACCOUNT_AUTH && isProduction && parsedOrigin.protocol !== 'https:') {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_WEB_ORIGIN'],
        message: 'ALLOW_PUBLIC_ACCOUNT_AUTH ở production yêu cầu AUTH_WEB_ORIGIN dùng HTTPS.',
      });
    }
  });

export const env = envSchema.parse(process.env);
export const webOrigins = env.WEB_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const authWebOrigin = new URL(env.AUTH_WEB_ORIGIN).origin;
