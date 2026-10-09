/**
 * Константы и интерфейсы модуля LLM.
 */

/* Таймаут сетевого запроса к LLM по умолчанию (30 секунд) */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

/* Модель по умолчанию */
export const DEFAULT_LLM_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

/* Лимит токенов по умолчанию для развернутых ответов (SEO-контент, статьи, FAQ) */
export const DEFAULT_LLM_MAX_TOKENS = 1200;

export interface LlmGenerateTextOptions {
  /* Системный промпт (роль и инструкция) */
  systemPrompt: string;
  /* Дополнительный пользовательский запрос */
  userPrompt?: string;
  /* Имя модели (опционально) */
  model?: string;
  /* Максимальное количество генерируемых токенов */
  maxTokens?: number;
  /* Температура выборки (креативность от 0.0 до 1.0) */
  temperature?: number;
  /* Таймаут запроса в миллисекундах */
  timeoutMs?: number;
}

export interface OpenAiChoiceMessage {
  content?: string;
}

export interface OpenAiChoice {
  message?: OpenAiChoiceMessage;
}

export interface OpenAiChatCompletionResponse {
  choices?: OpenAiChoice[];
}
