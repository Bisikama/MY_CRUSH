import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Keep the converter's recursive ZodSchema<any> signature behind this boundary:
// comparing it with a generic ZodType exceeds TypeScript's instantiation limit.
const convertSchema = zodToJsonSchema as unknown as (
  value: z.ZodType<unknown>,
  options: { target: 'openApi3'; $refStrategy: 'none' },
) => SchemaObject;

function schema(value: z.ZodType<unknown>): SchemaObject {
  return convertSchema(value, { target: 'openApi3', $refStrategy: 'none' });
}

/** Documentation only; authorization and Zod validation remain in the controllers. */
export function ApiEndpoint(options: {
  summary: string;
  description?: string;
  auth?: boolean;
  body?: z.ZodType<unknown>;
  example?: unknown;
  response: z.ZodType<unknown>;
  status?: number;
  errors?: number[];
}) {
  const decorators = [
    ApiOperation({ summary: options.summary, description: options.description }),
    ApiResponse({ status: options.status ?? 200, schema: schema(options.response) }),
  ];
  if (options.auth) decorators.push(ApiBearerAuth('guest-token'));
  if (options.body)
    decorators.push(
      ApiBody({
        required: true,
        schema: {
          ...schema(options.body),
          ...(options.example === undefined ? {} : { example: options.example }),
        },
      }),
    );
  const errors = new Set([
    500,
    ...(options.auth ? [401] : []),
    ...(options.body ? [400] : []),
    ...(options.errors ?? []),
  ]);
  for (const status of errors)
    decorators.push(
      ApiResponse({
        status,
        description:
          (
            {
              400: 'Dữ liệu không hợp lệ',
              401: 'Guest token thiếu hoặc không hợp lệ',
              403: 'Không có quyền',
              404: 'Không tìm thấy',
              409: 'Xung đột hoặc không đủ Coins',
              503: 'Database chưa sẵn sàng',
            } as Record<number, string>
          )[status] ?? 'Lỗi nội bộ',
        schema: schema(zErrorSchema),
      }),
    );
  return applyDecorators(...decorators);
}

const zErrorSchema = z.object({ code: z.string(), message: z.string() });
