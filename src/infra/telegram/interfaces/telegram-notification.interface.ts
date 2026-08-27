/** Параметры отправки уведомления в Telegram */
export interface TelegramNotificationParams {
  title: string;
  message: string;
  chatId?: string;
  fields?: Record<string, string | number | boolean | null | undefined>;
}
