import { Module } from '@nestjs/common';
import { PlayersModule } from '../players/players.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { InventoryService } from '../inventory/inventory.service';
@Module({
  imports: [PlayersModule],
  controllers: [ShopController],
  providers: [ShopService, InventoryService],
})
export class ShopModule {}
