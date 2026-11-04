import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiEndpoint } from '../../common/api-endpoint';
@Controller('health')
@ApiTags('Health')
export class HealthController {
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
    } catch {
      throw new ServiceUnavailableException('PostgreSQL chưa sẵn sàng');
    }
  }
}
