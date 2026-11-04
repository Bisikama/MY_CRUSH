import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { QuestionPacksController } from './question-packs.controller';
@Module({ imports: [PlayersModule], controllers: [QuestionPacksController] })
export class QuestionPacksModule {}
