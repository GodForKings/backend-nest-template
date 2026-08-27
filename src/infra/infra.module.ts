import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { TelegramModule } from './telegram/telegram.module';

/**
 * Глобальный инфраструктурный модуль.
 * `@Global()` делает все экспорты доступными во всём приложении.
 */
@Global()
@Module({
  imports: [PrismaModule, MailModule, UploadModule, TelegramModule],
  exports: [PrismaModule, MailModule, UploadModule, TelegramModule],
})
export class InfraModule {}
