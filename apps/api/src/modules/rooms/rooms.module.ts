import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RoomsService } from './rooms.service';
@Module({
  imports: [PlayersModule, SessionsModule],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
