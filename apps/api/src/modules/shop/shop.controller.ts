import { AllowGuest, CurrentPlayer, Public } from '../auth/auth-guard';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import {
  equipRequestSchema,
  purchaseRequestSchema,
  itemSchema,
  inventoryResponseSchema,
  purchaseResponseSchema,
  loadoutSchema,
} from '../../common/rest-schemas';
import { InventoryService } from '../inventory/inventory.service';
import { ShopService } from './shop.service';
@Controller('shop')
@ApiTags('Shop')
export class ShopController {
  constructor(
    @Inject(ShopService) private readonly shop: ShopService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}
  @ApiEndpoint({ summary: 'Liệt kê cosmetic đang bán', response: z.array(itemSchema) })
  @Public()
  @Get('items')
  list() {
    return this.shop.list();
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Xem vật phẩm sở hữu và trang bị',
    auth: true,
    response: inventoryResponseSchema,
  })
  @Get('inventory')
  async owned(@CurrentPlayer() playerId: string) {
    return this.inventory.list(playerId);
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Mua cosmetic bằng Coins',
    description:
      'Tạo requestId UUID mới cho mỗi giao dịch; khi retry cùng giao dịch phải giữ nguyên requestId và itemId. Server trừ Coins và cấp vật phẩm trong một transaction.',
    auth: true,
    body: purchaseRequestSchema,
    response: purchaseResponseSchema,
    status: 201,
    errors: [404, 409],
  })
  @Post('purchases')
  async purchase(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const data = purchaseRequestSchema.parse(body);
    return this.shop.purchase(playerId, data.itemId, data.requestId);
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Trang bị cosmetic đã sở hữu',
    auth: true,
    body: equipRequestSchema,
    response: loadoutSchema,
    status: 201,
    errors: [403],
  })
  @Post('equip')
  async equip(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    const data = equipRequestSchema.parse(body);
    return this.inventory.equip(playerId, data.itemId);
  }
}
