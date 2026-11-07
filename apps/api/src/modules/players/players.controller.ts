import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthSessions, publicIdentity } from '../auth/auth-session.service';
import { sessionCookie } from '../auth/auth-security';
import { AllowGuest, CurrentPlayer, Public, type AuthRequest } from '../auth/auth-guard';
import { Body, Controller, Get, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import {
  guestRequestSchema,
  guestResponseSchema,
  profileResponseSchema,
  historyResponseSchema,
} from '../../common/rest-schemas';
import { PlatformStore } from '../persistence/store';

@Controller('players')
@ApiTags('Players')
export class PlayersController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
    @Inject(PlatformStore) private readonly store: PlatformStore,
  ) {}
  @Public()
  @ApiEndpoint({
    summary: 'Tạo người chơi khách',
    body: guestRequestSchema,
    example: { nickname: 'Minh' },
    response: guestResponseSchema,
    status: 201,
  })
  @Post('guest')
  async create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const value = await this.auth.guest(guestRequestSchema.parse(body).nickname, request.principal);
    sessionCookie(response, value);
    return publicIdentity(await this.sessions.require(value));
  }
  @AllowGuest()
  @ApiEndpoint({ summary: 'Xem hồ sơ, Coins và XP', auth: true, response: profileResponseSchema })
  @Get('me')
  async profile(@CurrentPlayer() playerId: string) {
    return this.store.profile(playerId);
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Xem tối đa 20 trận đã hoàn thành gần nhất',
    auth: true,
    response: historyResponseSchema,
  })
  @Get('me/history')
  async history(@CurrentPlayer() playerId: string) {
    return this.store.history(playerId);
  }
}
