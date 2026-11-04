import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
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
import { PlayersService } from '../players/players.service';
import { InventoryService } from '../inventory/inventory.service';
import { ShopService } from './shop.service';
@Controller('shop')
@ApiTags('Shop')
export class ShopController {
  constructor(
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(ShopService) private readonly shop: ShopService,
    @Inject(InventoryService) private readonly inventory: InventoryService,
  ) {}
  @ApiEndpoint({ summary: 'Liệt kê cosmetic đang bán', response: z.array(itemSchema) })
  @Get('items')
  list() {
    return this.shop.list();
  }
  @ApiEndpoint({
    summary: 'Xem vật phẩm sở hữu và trang bị',
    auth: true,
    response: inventoryResponseSchema,
  })
  @Get('inventory')
  async owned(@Headers('authorization') auth: string) {
    return this.inventory.list((await this.players.fromHeader(auth)).id);
  }
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
  async purchase(@Headers('authorization') auth: string, @Body() body: unknown) {
    const data = purchaseRequestSchema.parse(body);
    return this.shop.purchase(
      (await this.players.fromHeader(auth)).id,
      data.itemId,
      data.requestId,
    );
  }
  @ApiEndpoint({
    summary: 'Trang bị cosmetic đã sở hữu',
    auth: true,
    body: equipRequestSchema,
    response: loadoutSchema,
    status: 201,
    errors: [403],
  })
  @Post('equip')
  async equip(@Headers('authorization') auth: string, @Body() body: unknown) {
    const data = equipRequestSchema.parse(body);
    return this.inventory.equip((await this.players.fromHeader(auth)).id, data.itemId);
  }
}
