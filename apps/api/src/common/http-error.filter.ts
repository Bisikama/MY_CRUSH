import { ArgumentsHost, Catch, HttpException, Logger, type ExceptionFilter } from '@nestjs/common';
import { DomainError } from '@duoquest/game-core';
import { ZodError } from 'zod';
import type { Response } from 'express';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof ZodError)
      return response.status(400).json({
        code: 'INVALID_INPUT',
        message: error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
      });
    if (error instanceof DomainError) {
      const statuses = {
        INVALID_INPUT: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        CONFLICT: 409,
        TOO_LATE: 409,
        RATE_LIMITED: 429,
        INTERNAL: 500,
      };
      return response
        .status(statuses[error.code])
        .json({ code: error.code, message: error.message });
    }
    if (error instanceof HttpException)
      return response
        .status(error.getStatus())
        .json({ code: 'INVALID_INPUT', message: error.message });
    this.logger.error(error);
    return response.status(500).json({
      code: 'INTERNAL',
      message: 'Không thể hoàn thành yêu cầu. Kiểm tra API/database rồi thử lại.',
    });
  }
}
