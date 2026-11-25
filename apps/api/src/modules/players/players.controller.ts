import type { Response } from 'express';
import { AuthService } from '../auth/auth.service';
import { AuthSessions, publicIdentity } from '../auth/auth-session.service';
import { AuthThrottle } from '../auth/auth-throttle';
import { sessionCookie } from '../auth/auth-security';
import { AllowGuest, CurrentPlayer, Public, type AuthRequest } from '../auth/auth-guard';
import { Body, Controller, Get, Inject, Optional, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import { resolveClientIp } from '../../common/client-ip';
import {
  guestRequestSchema,
  guestResponseSchema,
  profileResponseSchema,
  historyResponseSchema,
} from '../../common/rest-schemas';
import { PlatformStore } from '../persistence/store';

const GUEST_RATE_LIMITS = {
  shortWindowMs: 15 * 60_000,
  shortLimit: 20,
  dayWindowMs: 24 * 60 * 60_000,
  dayLimit: 60,
} as const;

@Controller('players')
@ApiTags('Players')
export class PlayersController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AuthSessions) private readonly sessions: AuthSessions,
    @Inject(PlatformStore) private readonly store: PlatformStore,
    @Optional() @Inject(AuthThrottle) private readonly throttle?: AuthThrottle,
  ) {}
  @Public()
  @ApiEndpoint({
    summary: 'Tạo người chơi khách',
    body: guestRequestSchema,
    example: { nickname: 'Minh' },
    response: guestResponseSchema,
    status: 201,
    errors: [429],
  })
  @Post('guest')
  async create(
    @Body() body: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = guestRequestSchema.parse(body);
    if (this.throttle) {
      const clientIp = resolveClientIp(request.socket.remoteAddress, request.headers);
      await this.throttle.reserve(
        'guest-ip-15m',
        clientIp,
        GUEST_RATE_LIMITS.shortLimit,
        GUEST_RATE_LIMITS.shortWindowMs,
      );
      await this.throttle.reserve(
        'guest-ip-day',
        clientIp,
        GUEST_RATE_LIMITS.dayLimit,
        GUEST_RATE_LIMITS.dayWindowMs,
      );
    }
    const value = await this.auth.guest(data.nickname, request.principal);
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
