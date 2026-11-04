import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import {
  guestRequestSchema,
  guestResponseSchema,
  profileResponseSchema,
  historyResponseSchema,
} from '../../common/rest-schemas';
import { PlayersService } from './players.service';
import { PlatformStore } from '../persistence/store';

@Controller('players')
@ApiTags('Players')
export class PlayersController {
  constructor(
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(PlatformStore) private readonly store: PlatformStore,
  ) {}
  @ApiEndpoint({
    summary: 'Tạo người chơi khách',
    body: guestRequestSchema,
    example: { nickname: 'Minh' },
    response: guestResponseSchema,
    status: 201,
  })
  @Post('guest')
  create(@Body() body: unknown) {
    return this.players.create(guestRequestSchema.parse(body).nickname);
  }
  @ApiEndpoint({ summary: 'Xem hồ sơ, Coins và XP', auth: true, response: profileResponseSchema })
  @Get('me')
  async profile(@Headers('authorization') auth?: string) {
    return this.store.profile((await this.players.fromHeader(auth)).id);
  }
  @ApiEndpoint({
    summary: 'Xem tối đa 20 trận đã hoàn thành gần nhất',
    auth: true,
    response: historyResponseSchema,
  })
  @Get('me/history')
  async history(@Headers('authorization') auth?: string) {
    return this.store.history((await this.players.fromHeader(auth)).id);
  }
}
