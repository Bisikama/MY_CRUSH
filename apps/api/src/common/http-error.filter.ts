import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@duoquest/game-core';
import { ZodError } from 'zod';
import type { Response } from 'express';
import {
  DOMAIN_ERROR_STATUS,
  ensureRequestId,
  formatZodError,
  httpStatusToErrorCode,
  safeHttpMessage,
  serializeErrorForLog,
  type RequestWithContext,
} from './error-utils';

function isBodyParserError(error: unknown): error is Error & { type: string; status?: number } {
  if (!(error instanceof Error)) return false;
  const type = (error as { type?: unknown }).type;
  return type === 'entity.parse.failed' || type === 'entity.too.large';
}

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const requestId = ensureRequestId(request, response);
    const context = {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      playerId: request.principal?.playerId ?? null,
    };

    if (error instanceof ZodError) {
      this.logger.debug(
        JSON.stringify({
          ...context,
          status: 400,
          code: 'INVALID_INPUT',
          issues: error.issues.length,
        }),
      );
      return response.status(400).json({
        code: 'INVALID_INPUT',
        message: formatZodError(error),
      });
    }

    if (error instanceof DomainError) {
      const status = DOMAIN_ERROR_STATUS[error.code];
      const entry = JSON.stringify({
        ...context,
        status,
        code: error.code,
        ...(error.cause ? { cause: serializeErrorForLog(error.cause) } : {}),
      });
      if (status >= 500) this.logger.error(entry);
      else if (status === 403 || status === 429) this.logger.warn(entry);
      else this.logger.debug(entry);
      return response.status(status).json({ code: error.code, message: error.message });
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const hasStructuredBody =
        typeof body === 'object' &&
        body !== null &&
        'code' in body &&
        typeof (body as { code: unknown }).code === 'string' &&
        'message' in body &&
        typeof (body as { message: unknown }).message === 'string';
      const code = hasStructuredBody
        ? (body as { code: string }).code
        : httpStatusToErrorCode(status);
      const message = hasStructuredBody
        ? (body as { message: string }).message
        : safeHttpMessage(status);

      const entry = JSON.stringify({
        ...context,
        status,
        code,
        ...(status >= 500 ? { error: serializeErrorForLog(error) } : {}),
      });
      if (status >= 500) this.logger.error(entry);
      else if (status === 403 || status === 429 || code === 'CSRF_INVALID') this.logger.warn(entry);
      else this.logger.debug(entry);

      return response.status(status).json({ code, message });
    }

    if (isBodyParserError(error)) {
      const tooLarge = error.type === 'entity.too.large';
      const status = tooLarge ? 413 : 400;
      const code = tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INVALID_INPUT';
      this.logger.warn(JSON.stringify({ ...context, status, code, type: error.type }));
      return response.status(status).json({
        code,
        message: tooLarge
          ? 'Dữ liệu gửi lên vượt quá giới hạn cho phép.'
          : 'Dữ liệu JSON không hợp lệ.',
      });
    }

    this.logger.error(
      JSON.stringify({
        ...context,
        status: 500,
        code: 'INTERNAL',
        error: serializeErrorForLog(error),
      }),
    );
    return response.status(500).json({
      code: 'INTERNAL',
      message: safeHttpMessage(500),
    });
  }
}
