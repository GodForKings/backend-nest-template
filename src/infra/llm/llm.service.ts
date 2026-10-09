import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ProxyAgent,
  fetch as undiciFetch,
  type RequestInit as UndiciRequestInit,
  type Response as UndiciResponse,
} from 'undici';
import { extractErrorMessage } from '../../common';
import {
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_TIMEOUT_MS,
  OpenAiChatCompletionResponse,
  type LlmGenerateTextOptions,
} from './interfaces';

/**
 * Инфраструктурный сервис интеграции с моделями LLM (OpenRouter / Groq / Cloudflare AI / OpenAI).
 * Поддерживает:
 * - Автоматическое туннелирование через ProxyAgent (Xray / HTTP прокси).
 * - Устойчивую работу с undici.fetch для Node.js.
 * - Авто-retry при превышении лимитов (HTTP 429).
 * - Чистые исключения с детализацией ошибки без захламления серверных логов.
 */
@Injectable()
export class LlmService {
  private proxyDispatcher: ProxyAgent | null | undefined = undefined;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Генерация текста по системному и пользовательскому промптам.
   */
  async generateText(
    options: LlmGenerateTextOptions,
    attempt = 1,
  ): Promise<string> {
    const {
      systemPrompt,
      userPrompt,
      model: rawModel,
      maxTokens = DEFAULT_LLM_MAX_TOKENS,
      temperature = 0.7,
      timeoutMs = DEFAULT_LLM_TIMEOUT_MS,
    } = options;

    const endpoint = this.getBaseUrl();
    const apiKey = this.getApiKey();
    const model = rawModel?.trim() || this.getModel();
    const isOpenRouter = this.isOpenRouterEndpoint(endpoint);

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      {
        role: 'user' as const,
        content:
          userPrompt?.trim() ||
          'Сгенерируй текст строго по указанной выше системной инструкции.',
      },
    ];

    const headers = this.buildHeaders(endpoint, apiKey, isOpenRouter);
    const body = this.buildRequestBody(
      model,
      messages,
      maxTokens,
      temperature,
      isOpenRouter,
    );

    const dispatcher = this.getProxyDispatcher();
    const fetchOptions: UndiciRequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      ...(dispatcher ? { dispatcher } : {}),
    };

    try {
      const response = await undiciFetch(endpoint, fetchOptions);

      if (!response.ok) {
        return await this.handleFailedResponse(response, options, attempt);
      }

      const data =
        (await response.json()) as OpenAiChatCompletionResponse | null;
      const text = data?.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new BadGatewayException(
          'Внешний сервис LLM вернул пустой результат',
        );
      }

      return text;
    } catch (error: unknown) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new BadGatewayException(
          `Превышено время ожидания ответа от сервиса LLM (${Math.round(timeoutMs / 1000)} сек)`,
        );
      }

      const message = extractErrorMessage(error, 'Сетевой сбой');
      throw new BadGatewayException(
        `Сетевой сбой при обращении к сервису LLM: ${message}`,
      );
    }
  }

  /**
   * Обработка неуспешного HTTP-ответа провайдера (retry при 429 либо читаемое исключение).
   */
  private async handleFailedResponse(
    response: UndiciResponse,
    options: LlmGenerateTextOptions,
    attempt: number,
  ): Promise<string> {
    const errorBody = await response.text().catch(() => '');

    /* При превышении квоты (HTTP 429) автоматически ожидаем и повторяем запрос до 3 раз */
    if (response.status === 429 && attempt <= 3) {
      const match = errorBody.match(/try again in ([\d.]+)s/i);
      const waitSeconds = match ? parseFloat(match[1]) + 0.5 : 4 * attempt;
      const waitMs = Math.ceil(waitSeconds * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.generateText(options, attempt + 1);
    }

    const detailMessage = extractErrorMessage(
      errorBody,
      'Пустой ответ провайдера',
    );
    throw new BadGatewayException(
      `Ошибка LLM API (${response.status}): ${detailMessage}`,
    );
  }

  /**
   * Формирование HTTP-заголовков с учетом авторизации и параметров провайдера.
   */
  private buildHeaders(
    endpoint: string,
    apiKey: string,
    isOpenRouter: boolean,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'NestJS-Backend-Template/1.0',
    };

    if (isOpenRouter) {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL')?.trim() ||
        'https://localhost:3000';
      headers['HTTP-Referer'] = frontendUrl;
      headers['X-Title'] = 'NestJS Backend Template';
    }

    const isCloudflareGateway = endpoint.includes('gateway.ai.cloudflare.com');
    const isCloudflareToken =
      apiKey.startsWith('cfut_') || apiKey.startsWith('cf_');
    const cfGatewayToken =
      this.configService.get<string>('LLM_CF_TOKEN')?.trim() ||
      this.configService.get<string>('LLM_CF_GATEWAY_TOKEN')?.trim();

    if (isCloudflareGateway && cfGatewayToken) {
      headers['cf-aig-authorization'] = `Bearer ${cfGatewayToken}`;
    } else if (isCloudflareToken) {
      headers['cf-aig-authorization'] = `Bearer ${apiKey}`;
    }

    if (!isCloudflareToken || cfGatewayToken) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  /**
   * Формирование тела запроса к OpenAI-совместимому API.
   */
  private buildRequestBody(
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>,
    maxTokens: number,
    temperature: number,
    isOpenRouter: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    if (isOpenRouter) {
      /* Отключаем скрытые рассуждения у reasoning-моделей OpenRouter для экономии токенов */
      body.reasoning = { effort: 'none' };
    }

    return body;
  }

  /**
   * Проверка, относится ли эндпоинт к сервису OpenRouter.
   */
  private isOpenRouterEndpoint(endpoint: string): boolean {
    return (
      endpoint.includes('openrouter.ai') || endpoint.includes('/openrouter')
    );
  }

  /**
   * Получение HTTP-прокси агента (для обхода блокировок через туннель Xray / HTTP прокси).
   */
  private getProxyDispatcher(): ProxyAgent | undefined {
    if (this.proxyDispatcher !== undefined) {
      return this.proxyDispatcher ?? undefined;
    }

    const proxyUrl = this.configService.get<string>('LLM_PROXY_URL')?.trim();
    this.proxyDispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : null;

    return this.proxyDispatcher ?? undefined;
  }

  /**
   * Получение базового URL для запросов к API LLM.
   */
  private getBaseUrl(): string {
    const rawUrl = this.configService.getOrThrow<string>('LLM_BASE_URL').trim();

    if (rawUrl.endsWith('/chat/completions')) {
      return rawUrl;
    }

    const cleanBase = rawUrl.replace(/\/+$/, '');
    if (cleanBase.endsWith('/v1') || cleanBase.endsWith('/openrouter')) {
      return `${cleanBase}/chat/completions`;
    }

    return `${cleanBase}/openai/v1/chat/completions`;
  }

  /**
   * Получение API-ключа для авторизации в сервисе LLM.
   */
  private getApiKey(): string {
    return this.configService.getOrThrow<string>('LLM_API_KEY').trim();
  }

  /**
   * Получение идентификатора модели LLM из конфигурации или значения по умолчанию.
   */
  private getModel(): string {
    return (
      this.configService.get<string>('LLM_MODEL')?.trim() || DEFAULT_LLM_MODEL
    );
  }
}
