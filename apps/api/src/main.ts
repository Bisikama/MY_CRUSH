import 'reflect-metadata';
import './common/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import { env, webOrigins } from './common/config';
import { HttpErrorFilter } from './common/http-error.filter';
import { setupSwagger } from './common/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigins });
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  setupSwagger(app);
  await app.listen(env.API_PORT, env.API_HOST);
  console.log(`DuoQuest API listening on ${env.API_HOST}:${env.API_PORT}`);
}
void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
