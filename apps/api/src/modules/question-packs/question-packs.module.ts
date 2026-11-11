import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { QuestionPacksController } from './question-packs.controller';
import { QuizPreparationService } from './quiz-preparation.service';
@Module({
  imports: [PlayersModule],
  controllers: [QuestionPacksController],
  providers: [QuizPreparationService],
  exports: [QuizPreparationService],
})
export class QuestionPacksModule {}
