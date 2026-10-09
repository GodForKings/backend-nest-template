/**
 * Извлечение читаемого текста ошибки из тела ответа внешних API или объектов исключений.
 * Поддерживает форматы OpenAI/OpenRouter ({ error: { message } }), Cloudflare ({ error }),
 * Telegram ({ description }), FastAPI ({ detail }), NestJS ({ message }) и обычные строки.
 *
 * @param input Сырой текст ответа, JSON-строка или пойманный объект ошибки.
 * @param fallback Текст по умолчанию, если сообщение пустое.
 */
export function extractErrorMessage(
  input: unknown,
  fallback = 'Неизвестная ошибка внешнего сервиса',
): string {
  if (!input) {
    return fallback;
  }

  /* Если передан стандартный экземпляр Error */
  if (input instanceof Error) {
    const cause = (input as Error & { cause?: unknown }).cause;
    const causeMessage = cause ? extractErrorMessage(cause, '') : '';

    if (input.message === 'fetch failed' && causeMessage) {
      return `${causeMessage} (fetch failed)`;
    }

    const message = input.message.trim() || fallback;
    return causeMessage && causeMessage !== message
      ? `${message}: ${causeMessage}`
      : message;
  }

  /* Если передана строка (JSON или plain text) */
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) {
      return fallback;
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        return extractFromObject(parsed as Record<string, unknown>, trimmed);
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  /* Если передан произвольный объект */
  if (typeof input === 'object' && input !== null) {
    return extractFromObject(input as Record<string, unknown>, fallback);
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return String(input);
  }

  return fallback;
}

/**
 * Вспомогательное извлечение строкового сообщения из разобранного JSON-объекта.
 */
function extractFromObject(
  data: Record<string, unknown>,
  fallback: string,
): string {
  const errorObj =
    typeof data.error === 'object' && data.error !== null
      ? (data.error as Record<string, unknown>)
      : null;

  const candidate =
    (typeof errorObj?.message === 'string' && errorObj.message) ||
    (typeof data.error === 'string' && data.error) ||
    (typeof data.message === 'string' && data.message) ||
    (typeof data.description === 'string' && data.description) ||
    (typeof data.detail === 'string' && data.detail);

  return candidate && typeof candidate === 'string'
    ? candidate.trim()
    : fallback;
}
