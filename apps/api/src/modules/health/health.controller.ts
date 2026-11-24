import { Public } from '../auth/auth-guard';
import { Controller, Get, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiEndpoint } from '../../common/api-endpoint';
import { serializeErrorForLog } from '../../common/error-utils';

@Public()
@Controller('health')
@ApiTags('Health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @ApiEndpoint({
    summary: 'Kiểm tra API đang chạy',
    response: z.object({ status: z.literal('ok'), service: z.literal('duoquest-api') }),
  })
  @Get()
  live() {
    return { status: 'ok', service: 'duoquest-api' };
  }
  @ApiEndpoint({
    summary: 'Kiểm tra kết nối PostgreSQL',
    response: z.object({ status: z.literal('ok'), database: z.literal('up') }),
    errors: [503],
  })
  @Get('ready')
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'health:ready',
          code: 'SERVICE_UNAVAILABLE',
          error: serializeErrorForLog(error),
        }),
      );
      throw new ServiceUnavailableException({
        code: 'SERVICE_UNAVAILABLE',
        message: 'PostgreSQL chưa sẵn sàng',
      });
    }
  }
}
