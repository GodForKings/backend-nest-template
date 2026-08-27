import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import type { TelegramNotificationParams } from './interfaces/telegram-notification.interface';
import { formatTelegramMessage } from './lib/templates';

@Injectable()
export class TelegramService {
  private readonly bot: Telegraf | null = null;
  private readonly defaultChatId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.defaultChatId =
      this.configService.get<string>('TELEGRAM_CHAT_ID') || null;

    if (token) {
      this.bot = new Telegraf(token);
    }
  }

  /**
   * Возвращает экземпляр бота Telegraf или выбрасывает исключение.
   */
  private getBot(): Telegraf {
    if (!this.bot) {
      throw new BadRequestException(
        'Telegram-бот не настроен. Укажите TELEGRAM_BOT_TOKEN в .env',
      );
    }
    return this.bot;
  }

  /**
   * Отправка произвольного текстового сообщения в Telegram.
   */
  async sendMessage(
    text: string,
    chatId?: string,
    parseMode: 'HTML' | 'MarkdownV2' = 'HTML',
  ): Promise<void> {
    const targetChatId = chatId || this.defaultChatId;

    if (!targetChatId) {
      throw new BadRequestException(
        'Chat ID для отправки уведомления в Telegram не указан',
      );
    }

    const bot = this.getBot();

    try {
      await bot.telegram.sendMessage(targetChatId, text, {
        parse_mode: parseMode,
      });
    } catch {
      throw new InternalServerErrorException(
        'Не удалось отправить сообщение в Telegram. Попробуйте позже.',
      );
    }
  }

  /**
   * Отправка структурированного уведомления.
   */
  async sendNotification(params: TelegramNotificationParams): Promise<void> {
    if (!this.bot) {
      return;
    }

    const formattedMessage = formatTelegramMessage(params);
    await this.sendMessage(formattedMessage, params.chatId, 'HTML');
  }
}
