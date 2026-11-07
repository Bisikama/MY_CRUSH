import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { HttpErrorFilter } from '../src/common/http-error.filter';
import { webOrigins } from '../src/common/config';
import { MailService } from '../src/modules/auth/mail.service';

async function main() {
  if (
    process.env.RUN_AUTH_E2E !== '1' ||
    !new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test')
  )
    throw new Error('Auth browser fixture requires RUN_AUTH_E2E=1 and a dedicated _test database.');
  const inbox = new Map<string, string>();
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue({
      async send(to: string, _subject: string, message: string) {
        const code = /\b[0-9]{6}\b/.exec(message)?.[0];
        if (code) inbox.set(to, code);
        return 'accepted';
      },
    })
    .compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  app.getHttpAdapter().get('/__test/mail', (request: Request, response: Response) => {
    const email = typeof request.query.email === 'string' ? request.query.email : '';
    const code = inbox.get(email);
    response.setHeader('Cache-Control', 'no-store');
    return code ? response.json({ code }) : response.sendStatus(404);
  });
  await app.listen(4000, '127.0.0.1');
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
