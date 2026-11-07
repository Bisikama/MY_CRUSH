import { AllowGuest, CurrentPlayer } from '../auth/auth-guard';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { questionPackSchema } from '@duoquest/shared-types';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import { packSummarySchema } from '../../common/rest-schemas';
import { PlatformStore } from '../persistence/store';

@Controller('question-packs')
@ApiTags('Question packs')
export class QuestionPacksController {
  constructor(@Inject(PlatformStore) private readonly store: PlatformStore) {}
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Liệt kê bộ đề thư viện và bộ đề của guest',
    auth: true,
    response: z.array(packSummarySchema),
  })
  @Get()
  async list(@CurrentPlayer() playerId: string) {
    return this.store.listPacks(playerId);
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Kiểm tra bộ đề JSON, không lưu',
    description:
      'Kiểm tra thêm ID/prompt không trùng, đủ bốn lựa chọn A–D và nội dung lựa chọn không trùng. Bộ đề tự nhập không nhận Coins/XP.',
    auth: true,
    body: questionPackSchema,
    response: z.object({ pack: questionPackSchema, warning: z.string() }),
    status: 201,
  })
  @Post('preview')
  preview(@Body() body: unknown) {
    return {
      pack: questionPackSchema.parse(body),
      warning: 'Hãy duyệt tính chính xác của câu hỏi. Bộ đề tự nhập không nhận Coins/XP.',
    };
  }
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Lưu phiên bản bộ đề riêng',
    description: 'packId đã tồn tại phải thuộc guest hiện tại. Bộ đề tự nhập không nhận Coins/XP.',
    auth: true,
    body: questionPackSchema,
    response: packSummarySchema,
    status: 201,
    errors: [403],
  })
  @Post()
  async save(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    return this.store.savePack(questionPackSchema.parse(body), playerId);
  }
}
