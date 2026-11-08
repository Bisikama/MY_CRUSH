import type { Response } from 'express';
import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import { currentRoomResponseSchema } from '../../common/rest-schemas';
import { AllowGuest, CurrentPlayer } from '../auth/auth-guard';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@ApiTags('Rooms')
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly rooms: RoomsService) {}

  @AllowGuest()
  @ApiEndpoint({
    summary: 'Xem phòng hiện tại của người chơi theo phiên',
    auth: true,
    response: currentRoomResponseSchema,
  })
  @Get('current')
  async current(@CurrentPlayer() playerId: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return { room: await this.rooms.currentFor(playerId) };
  }
}
