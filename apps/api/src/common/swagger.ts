import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('DuoQuest REST API')
    .setDescription(
      'Tạo guest hoặc đăng nhập để trình duyệt nhận cookie phiên. Try it out tự lấy CSRF token cho request ghi. Socket.IO được mô tả trong docs/10-CONTRACTS.md.',
    )
    .setVersion('1.0')
    .addCookieAuth('dq_session', { type: 'apiKey', in: 'cookie' }, 'session-cookie')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: {
      persistAuthorization: false,
      validatorUrl: null,
      withCredentials: true,
      requestInterceptor: async (request: {
        url: string;
        method: string;
        headers: Record<string, string>;
      }) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
          const response = await fetch('/api/auth/csrf', {
            credentials: 'same-origin',
          });
          if (response.ok) {
            const body = (await response.json()) as { csrfToken: string };
            request.headers['X-CSRF-Token'] = body.csrfToken;
          }
        }
        return request;
      },
    },
  });
  return document;
}
