import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extractErrorMessage, isDev } from '../../common';
import type {
  IndexNowConfigStatus,
  IndexNowPayload,
  IndexNowSubmitResult,
} from './interfaces';

/**
 * Высокоустойчивый (Tier-S) клиент протокола IndexNow.
 * Инкапсулирует:
 * - Формирование и валидацию пакетов по спецификации IndexNow (до 10 000 URL).
 * - Определение окружения через isDev (блокировка вызовов с локалхоста).
 * - Буферизацию (микробатчинг с дебаунсом) для предотвращения лавинообразных запросов.
 * - Устойчивость к сетевым сбоям (Retry с задержкой при 429 / 5xx / timeout).
 */
@Injectable()
export class IndexNowService implements OnModuleDestroy {
  /* URL API поискового шлюза IndexNow (Яндекс) */
  private readonly defaultApiEndpoint = 'https://yandex.com/indexnow';
  /* Максимальный размер пакета по спецификации протокола */
  private readonly maxBatchSize = 10000;
  /* Таймаут одного HTTP-запроса (10 секунд) */
  private readonly requestTimeoutMs = 10000;
  /* Задержка дебаунса для буферизации фоновых событий (1.5 секунды) */
  private readonly debounceDelayMs = 1500;
  /* Максимальное количество повторных попыток при транзиентных сбоях */
  private readonly maxRetries = 2;

  /* Буфер URL для микробатчинга */
  private readonly bufferedUrls = new Set<string>();
  /* Идентификатор таймера сброса буфера */
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Корректный сброс накопившегося буфера при плановой остановке приложения (Graceful Shutdown).
   */
  async onModuleDestroy(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    await this.flushBuffer();
  }

  /**
   * Получение сконфигурированного хоста сайта.
   */
  getHost(): string {
    const rawHost = this.configService.get<string>('INDEXNOW_HOST');
    if (rawHost?.trim()) {
      return rawHost
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (frontendUrl) {
      try {
        const parsed = new URL(frontendUrl);
        return parsed.hostname;
      } catch {
        /* Игнорируем ошибку парсинга */
      }
    }

    return 'localhost';
  }

  /**
   * Получение ключа авторизации IndexNow.
   */
  private getKey(): string {
    return this.configService.get<string>('INDEXNOW_KEY')?.trim() ?? '';
  }

  /**
   * Получение адреса расположения файла подтверждения ключа.
   */
  private getKeyLocation(host: string, key: string): string {
    const customLocation = this.configService.get<string>(
      'INDEXNOW_KEY_LOCATION',
    );
    if (customLocation?.trim()) {
      return customLocation.trim();
    }

    return `https://${host}/${key}.txt`;
  }

  /**
   * Проверка, активна ли отправка реальных сетевых запросов.
   */
  private isEnabled(): boolean {
    const forceEnabled =
      this.configService.get<string>('INDEXNOW_FORCE_ENABLED') === 'true';
    if (forceEnabled) {
      return true;
    }

    /* В режиме разработки боевые запросы блокируются для защиты хоста */
    return !isDev(this.configService);
  }

  /**
   * Диагностический статус конфигурации.
   */
  getStatus(): IndexNowConfigStatus {
    const host = this.getHost();
    const key = this.getKey();
    const isDevEnvironment = isDev(this.configService);
    const enabled = this.isEnabled();

    return {
      enabled,
      isDev: isDevEnvironment,
      host,
      hasKey: Boolean(key),
      keyLocation: key ? this.getKeyLocation(host, key) : '',
    };
  }

  /**
   * Добавление URL в буфер с отложенной пакетной отправкой (Debounce Micro-batching).
   * Позволяет склеивать десятки частых событий (например, массовый импорт) в единый POST.
   */
  enqueueUrls(urls: string[]): void {
    for (const url of urls) {
      const clean = url.trim();
      if (clean) {
        this.bufferedUrls.add(clean);
      }
    }

    if (this.bufferedUrls.size === 0) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flushBuffer().catch(() => undefined);
    }, this.debounceDelayMs);
  }

  /**
   * Принудительный сброс накопившегося буфера URL.
   */
  private async flushBuffer(): Promise<void> {
    if (this.bufferedUrls.size === 0) {
      return;
    }

    const urlsToFlush = Array.from(this.bufferedUrls);
    this.bufferedUrls.clear();
    this.debounceTimer = null;

    await this.notifyUrls(urlsToFlush);
  }

  /**
   * Отправка одного пакета с автоматическими повторными попытками при сбоях (Resilience).
   */
  private async sendBatchWithRetry(
    endpoint: string,
    payload: IndexNowPayload,
    attempt = 1,
  ): Promise<{ ok: boolean; status: number; text: string }> {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      const isSuccess = response.ok || response.status === 202;
      const text = isSuccess ? '' : await response.text().catch(() => '');

      /* При ошибках перегрузки 429 или временных сбоях 5xx выполняем retry с паузой */
      const shouldRetry =
        (response.status === 429 || response.status >= 500) &&
        attempt <= this.maxRetries;

      if (!isSuccess && shouldRetry) {
        const delayMs = attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.sendBatchWithRetry(endpoint, payload, attempt + 1);
      }

      return {
        ok: isSuccess,
        status: response.status,
        text,
      };
    } catch (error: unknown) {
      /* Повторная попытка при сетевом таймауте или обрыве соединения */
      if (attempt <= this.maxRetries) {
        const delayMs = attempt * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.sendBatchWithRetry(endpoint, payload, attempt + 1);
      }

      const errorMessage = extractErrorMessage(error, 'Сетевой сбой');
      return {
        ok: false,
        status: 500,
        text: errorMessage,
      };
    }
  }

  /**
   * Неблокирующая отправка пакета URL в IndexNow.
   */
  async notifyUrls(urls: string[]): Promise<IndexNowSubmitResult> {
    const uniqueUrls = Array.from(
      new Set(urls.map((u) => u.trim()).filter(Boolean)),
    );

    if (uniqueUrls.length === 0) {
      return {
        success: true,
        submittedUrls: [],
        total: 0,
        simulated: false,
        message: 'Список URL пуст, отправка не требуется',
      };
    }

    const host = this.getHost();
    const key = this.getKey();
    const enabled = this.isEnabled();

    if (!enabled) {
      return {
        success: true,
        submittedUrls: uniqueUrls,
        total: uniqueUrls.length,
        simulated: true,
        message: `Симуляция отправки (режим разработки): ${uniqueUrls.length} URL для хоста "${host}". Реальный запрос пропущен.`,
      };
    }

    if (!key) {
      return {
        success: false,
        submittedUrls: [],
        total: uniqueUrls.length,
        simulated: false,
        message: 'Ключ INDEXNOW_KEY не задан в конфигурации. Запрос отклонён.',
      };
    }

    const keyLocation = this.getKeyLocation(host, key);
    const endpoint =
      this.configService.get<string>('INDEXNOW_ENDPOINT')?.trim() ||
      this.defaultApiEndpoint;

    /* Пакетная отправка пачками по maxBatchSize (до 10 000 по спецификации) */
    for (let i = 0; i < uniqueUrls.length; i += this.maxBatchSize) {
      const batch = uniqueUrls.slice(i, i + this.maxBatchSize);
      const payload: IndexNowPayload = {
        host,
        key,
        keyLocation,
        urlList: batch,
      };

      const result = await this.sendBatchWithRetry(endpoint, payload);

      if (!result.ok) {
        return {
          success: false,
          submittedUrls: uniqueUrls,
          total: uniqueUrls.length,
          simulated: false,
          statusCode: result.status,
          message: `Ошибка шлюза IndexNow (HTTP ${result.status}): ${result.text}`,
        };
      }
    }

    return {
      success: true,
      submittedUrls: uniqueUrls,
      total: uniqueUrls.length,
      simulated: false,
      statusCode: 200,
      message: `Успешно отправлено ${uniqueUrls.length} URL в IndexNow`,
    };
  }

  /**
   * Синхронная отправка из панели администратора с валидацией исключений.
   */
  async submitUrlsAdmin(urls: string[]): Promise<IndexNowSubmitResult> {
    const result = await this.notifyUrls(urls);

    if (!result.success && !result.simulated) {
      if (result.statusCode === 400 || result.statusCode === 422) {
        throw new BadRequestException(
          result.message || 'Некорректный запрос к IndexNow',
        );
      }
      throw new InternalServerErrorException(
        result.message || 'Ошибка отправки в поисковый шлюз IndexNow',
      );
    }

    return result;
  }
}
