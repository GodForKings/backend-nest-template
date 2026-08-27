import { configDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './common';

async function bootstrap() {
  configDotenv();
  const app = await NestFactory.create(AppModule);

  // Вынести cors в отдельный конфиг внутри папки common
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  // Глобальная валидация DTO через class-validator
  // whitelist: отсекает поля, не описанные в DTO
  // forbidNonWhitelisted: выбрасывает ошибку при лишних полях
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);
  await app.listen(process.env.PORT ?? 5000);
}

void bootstrap();
