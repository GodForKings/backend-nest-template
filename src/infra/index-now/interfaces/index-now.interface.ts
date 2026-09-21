/**
 * Контракт полезной нагрузки для запроса к API IndexNow (Яндекс, Bing).
 */
export interface IndexNowPayload {
  /* Хост сайта без протокола (например, example.com) */
  host: string;
  /* Ключ подтверждения владения хостом */
  key: string;
  /* Полный URL файла с ключом (например, https://example.com/key.txt) */
  keyLocation: string;
  /* Список публичных URL-адресов страниц, которые были созданы, изменены или удалены */
  urlList: string[];
}

/**
 * Результат операции отправки URL-адресов в протокол IndexNow.
 */
export interface IndexNowSubmitResult {
  /* Флаг успешности операции */
  success: boolean;
  /* Список фактически переданных или обработанных URL */
  submittedUrls: string[];
  /* Общее количество URL */
  total: number;
  /* Флаг симуляции (если вызов произошел в dev-режиме без реального обращения к API) */
  simulated: boolean;
  /* HTTP-код ответа от сервера IndexNow (при наличии) */
  statusCode?: number;
  /* Текстовое пояснение к результату */
  message?: string;
}

/**
 * Текущий статус конфигурации модуля IndexNow.
 */
export interface IndexNowConfigStatus {
  /* Включена ли боевая отправка в IndexNow */
  enabled: boolean;
  /* Определено ли текущее окружение как разработка (development) */
  isDev: boolean;
  /* Сконфигурированный хост сайта */
  host: string;
  /* Задан ли ключ верификации */
  hasKey: boolean;
  /* URL-адрес размещения файла ключа на сайте */
  keyLocation: string;
}
