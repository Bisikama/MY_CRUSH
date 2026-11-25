import 'reflect-metadata';
import './common/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { env, webOrigins } from './common/config';
import { requestIdMiddleware, serializeErrorForLog } from './common/error-utils';
import { HttpErrorFilter } from './common/http-error.filter';
import { securityHeadersMiddleware } from './common/security-headers';
import { setupSwagger } from './common/swagger';

const processLogger = new Logger('Process');
process.on('unhandledRejection', (reason: unknown) => {
  processLogger.error(
    JSON.stringify({ event: 'unhandledRejection', error: serializeErrorForLog(reason) }),
  );
});
process.on('uncaughtException', (error: Error) => {
  processLogger.error(
    JSON.stringify({ event: 'uncaughtException', error: serializeErrorForLog(error) }),
  );
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const httpServer = app.getHttpAdapter().getInstance() as {
    disable?: (setting: string) => void;
  };
  httpServer.disable?.('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(requestIdMiddleware);
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigins, credentials: true });
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  if (env.ENABLE_SWAGGER) setupSwagger(app);
  await app.listen(env.API_PORT, env.API_HOST);
  console.log(`DuoQuest API listening on ${env.API_HOST}:${env.API_PORT}`);
}
void bootstrap().catch((error: unknown) => {
  processLogger.error(JSON.stringify({ event: 'bootstrap', error: serializeErrorForLog(error) }));
  process.exitCode = 1;
});
