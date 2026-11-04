import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { GameRegistry } from './game-registry';
import { RewardsModule } from '../rewards/rewards.module';
@Module({
  imports: [RewardsModule],
  providers: [SessionsService, GameRegistry],
  exports: [SessionsService, GameRegistry],
})
export class SessionsModule {}
