import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
@Module({
  imports: [PlayersModule, SessionsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
