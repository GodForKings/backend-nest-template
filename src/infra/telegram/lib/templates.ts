import type { TelegramNotificationParams } from '../interfaces/telegram-notification.interface';

/**
 * Экранирует HTML-спецсимволы для безопасной отправки в Telegram.
 */
export const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Формирует красивое HTML-сообщение для Telegram.
 */
export const formatTelegramMessage = (
  params: TelegramNotificationParams,
): string => {
  let message = `🔔 <b>${escapeHtml(params.title)}</b>\n\n`;

  if (params.message) {
    message += `${escapeHtml(params.message)}\n\n`;
  }

  if (params.fields && Object.keys(params.fields).length > 0) {
    message += '📋 <b>Детали:</b>\n';
    for (const [key, value] of Object.entries(params.fields)) {
      if (value !== undefined && value !== null) {
        message += `• <b>${escapeHtml(key)}:</b> ${escapeHtml(String(value))}\n`;
      }
    }
  }

  message += `\n⏱ <i>${new Date().toLocaleString('ru-RU')}</i>`;

  return message;
};
