import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';
import { questionPackSchema } from '@duoquest/shared-types';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import { packSummarySchema } from '../../common/rest-schemas';
import { PlayersService } from '../players/players.service';
import { PlatformStore } from '../persistence/store';

@Controller('question-packs')
@ApiTags('Question packs')
export class QuestionPacksController {
  constructor(
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(PlatformStore) private readonly store: PlatformStore,
  ) {}
  @ApiEndpoint({
    summary: 'Liệt kê bộ đề thư viện và bộ đề của guest',
    auth: true,
    response: z.array(packSummarySchema),
  })
  @Get()
  async list(@Headers('authorization') auth?: string) {
    return this.store.listPacks((await this.players.fromHeader(auth)).id);
  }
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
  async preview(@Headers('authorization') auth: string, @Body() body: unknown) {
    await this.players.fromHeader(auth);
    return {
      pack: questionPackSchema.parse(body),
      warning: 'Hãy duyệt tính chính xác của câu hỏi. Bộ đề tự nhập không nhận Coins/XP.',
    };
  }
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
  async save(@Headers('authorization') auth: string, @Body() body: unknown) {
    return this.store.savePack(
      questionPackSchema.parse(body),
      (await this.players.fromHeader(auth)).id,
    );
  }
}
