import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger, setupCors, AllExceptionsFilter } from './common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* Поддержка реальных IP за Nginx / Cloudflare */
  app.set('trust proxy', 1);

  /* Корректная обработка сигналов завершения процесса */
  app.enableShutdownHooks();

  setupCors(app);

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  /* Глобальный фильтр исключений для стандартизации JSON-ответов об ошибках */
  app.useGlobalFilters(new AllExceptionsFilter());

  /* Глобальная валидация DTO через class-validator */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 5001);
}

void bootstrap();
