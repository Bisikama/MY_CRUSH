import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { SessionsModule } from '../sessions/sessions.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { QuestionPacksModule } from '../question-packs/question-packs.module';
@Module({
  imports: [PlayersModule, SessionsModule, QuestionPacksModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
