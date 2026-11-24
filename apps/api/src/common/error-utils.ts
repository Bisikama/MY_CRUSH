import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { DomainErrorCode, ErrorCode } from '@duoquest/shared-types';
import { ZodError } from 'zod';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

export type RequestWithContext = Request & {
  requestId?: string;
  principal?: { playerId?: string; accountId?: string | null };
};

export const DOMAIN_ERROR_STATUS: Record<DomainErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_LATE: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    )
    .join('; ');
}

export function httpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'INVALID_INPUT';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return status >= 500 ? 'INTERNAL' : 'INVALID_INPUT';
  }
}

export function safeHttpMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dữ liệu gửi lên không hợp lệ.';
    case 401:
      return 'Cần phiên hợp lệ.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy tài nguyên.';
    case 409:
      return 'Thao tác bị xung đột với trạng thái hiện tại.';
    case 413:
      return 'Dữ liệu gửi lên vượt quá giới hạn cho phép.';
    case 429:
      return 'Thao tác quá nhanh. Hãy thử lại sau.';
    case 503:
      return 'Dịch vụ tạm thời chưa sẵn sàng.';
    default:
      return 'Không thể hoàn thành yêu cầu. Kiểm tra API/database rồi thử lại.';
  }
}

export function serializeErrorForLog(error: unknown, depth = 0): Record<string, unknown> {
  if (error instanceof Error) {
    const record: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };
    const extra = error as Error & {
      code?: unknown;
      status?: unknown;
      type?: unknown;
      responseCode?: unknown;
      command?: unknown;
      cause?: unknown;
    };
    if (typeof extra.code === 'string' || typeof extra.code === 'number') record.code = extra.code;
    if (typeof extra.status === 'number') record.status = extra.status;
    if (typeof extra.type === 'string') record.type = extra.type;
    if (typeof extra.responseCode === 'number') record.responseCode = extra.responseCode;
    if (typeof extra.command === 'string') record.command = extra.command;
    if (error.stack) record.stack = error.stack;
    if (extra.cause !== undefined && depth < 2) {
      record.cause = serializeErrorForLog(extra.cause, depth + 1);
    }
    return record;
  }
  if (typeof error === 'object' && error !== null) {
    const extra = error as Record<string, unknown>;
    return {
      name: typeof extra.name === 'string' ? extra.name : 'NonErrorObject',
      message: typeof extra.message === 'string' ? extra.message : String(error),
      ...(typeof extra.code === 'string' || typeof extra.code === 'number'
        ? { code: extra.code }
        : {}),
    };
  }
  return { message: String(error) };
}

export function ensureRequestId(req: RequestWithContext, res?: Response): string {
  if (req.requestId) return req.requestId;
  const incoming = req.headers?.['x-request-id'];
  const id =
    typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  if (res && !res.headersSent) res.setHeader('X-Request-Id', id);
  return id;
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  ensureRequestId(req as RequestWithContext, res);
  next();
}
