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
  private readyOkUntil = 0;
  private readyCheckInFlight?: Promise<{ status: 'ok'; database: 'up' }>;
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
    const now = Date.now();
    if (now < this.readyOkUntil) return { status: 'ok' as const, database: 'up' as const };
    if (this.readyCheckInFlight) return this.readyCheckInFlight;
    this.readyCheckInFlight = (async () => {
      try {
        await this.db.$queryRaw`SELECT 1`;
        this.readyOkUntil = Date.now() + 3_000;
        return { status: 'ok' as const, database: 'up' as const };
      } catch (error) {
        this.readyOkUntil = 0;
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
      } finally {
        this.readyCheckInFlight = undefined;
      }
    })();
    return this.readyCheckInFlight;
  }
}
