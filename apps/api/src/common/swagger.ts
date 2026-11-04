import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('DuoQuest REST API')
    .setDescription(
      'Tạo guest qua POST /api/players/guest, sao chép token rồi bấm Authorize và dán token (không thêm Bearer). Try it out thực thi API và có thể thay đổi dữ liệu. Socket.IO được mô tả riêng trong docs/10-CONTRACTS.md.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', description: 'Guest token từ POST /api/players/guest' },
      'guest-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { persistAuthorization: false, validatorUrl: null },
  });
  return document;
}
