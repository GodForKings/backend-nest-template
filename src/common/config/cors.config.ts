import { INestApplication } from '@nestjs/common';

/**
 * Настройка CORS
 * Читает разрешенные адреса из переменной окружения CORS_ORIGINS через запятую.
 * В режиме разработки (если CORS_ORIGINS не задан) разрешает все запросы.
 */
export const setupCors = (app: INestApplication): void => {
  const originsEnv = process.env.CORS_ORIGINS;

  let origin: boolean | string[] = true;

  if (originsEnv) {
    const list = originsEnv.split(',').map((item) => item.trim());
    if (list.includes('*')) {
      origin = true;
    } else {
      origin = list;
    }
  }

  app.enableCors({
    origin,
    credentials: true,
  });
};
