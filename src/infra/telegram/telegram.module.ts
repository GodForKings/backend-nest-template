import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

/** Модуль интеграции с Telegram-ботом */
@Module({
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
