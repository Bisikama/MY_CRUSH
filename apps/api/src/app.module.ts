import { Module } from '@nestjs/common';
import { PersistenceModule } from './modules/persistence/persistence.module';
import { PlayersModule } from './modules/players/players.module';
import { QuestionPacksModule } from './modules/question-packs/question-packs.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthController } from './modules/health/health.controller';
import { ShopModule } from './modules/shop/shop.module';
@Module({
  imports: [PersistenceModule, PlayersModule, QuestionPacksModule, RealtimeModule, ShopModule],
  controllers: [HealthController],
})
export class AppModule {}
