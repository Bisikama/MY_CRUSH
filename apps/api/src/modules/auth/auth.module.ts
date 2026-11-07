import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RoomsModule } from '../rooms/rooms.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth-guard';
import { AuthSessions } from './auth-session.service';
import { AuthThrottle } from './auth-throttle';
import { EmailChallenges } from './email-challenge.service';
import { MailService } from './mail.service';
import { AuthService } from './auth.service';

@Global()
@Module({
  imports: [RoomsModule],
  controllers: [AuthController],
  providers: [
    AuthSessions,
    AuthThrottle,
    EmailChallenges,
    MailService,
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, AuthSessions],
})
export class AuthModule {}
