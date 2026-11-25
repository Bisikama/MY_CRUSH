import { AllowGuest, CurrentPlayer } from '../auth/auth-guard';
import { AuthThrottle } from '../auth/auth-throttle';
import { Body, Controller, Get, Inject, Optional, Post } from '@nestjs/common';
import { questionPackSchema, casualCatalogSchema } from '@duoquest/shared-types';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../../common/api-endpoint';
import { packSummarySchema } from '../../common/rest-schemas';
import { PlatformStore } from '../persistence/store';
import { QuizPreparationService } from './quiz-preparation.service';
import { parseQuestionPack } from './parse-question-pack';

const PACK_RATE_LIMITS = {
  windowMs: 15 * 60_000,
  previewLimit: 30,
  saveLimit: 10,
} as const;

@Controller('question-packs')
@ApiTags('Question packs')
export class QuestionPacksController {
  constructor(
    @Inject(PlatformStore) private readonly store: PlatformStore,
    @Inject(QuizPreparationService) private readonly preparation: QuizPreparationService,
    @Optional() @Inject(AuthThrottle) private readonly throttle?: AuthThrottle,
  ) {}
  @AllowGuest()
  @ApiEndpoint({
    summary: 'Danh mục câu đố vui đã duyệt',
    auth: true,
    response: casualCatalogSchema,
  })
  @Get('casual-catalog')
  catalog() {
    return this.preparation.catalog();
  }
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
      'Kiểm tra câu trùng theo đề bài và tập ảnh, bốn lựa chọn A–D, cùng nguồn CDN của ảnh. Bộ đề tự nhập không nhận Coins/XP.',
    auth: true,
    body: questionPackSchema,
    response: z.object({ pack: questionPackSchema, warning: z.string() }),
    status: 201,
    errors: [429],
  })
  @Post('preview')
  async preview(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    if (this.throttle) {
      await this.throttle.reserve(
        'pack-preview',
        playerId,
        PACK_RATE_LIMITS.previewLimit,
        PACK_RATE_LIMITS.windowMs,
      );
    }
    return {
      pack: parseQuestionPack(body),
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
    errors: [403, 429],
  })
  @Post()
  async save(@CurrentPlayer() playerId: string, @Body() body: unknown) {
    if (this.throttle) {
      await this.throttle.reserve(
        'pack-save',
        playerId,
        PACK_RATE_LIMITS.saveLimit,
        PACK_RATE_LIMITS.windowMs,
      );
    }
    return this.store.savePack(parseQuestionPack(body), playerId);
  }
}
