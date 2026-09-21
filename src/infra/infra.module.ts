import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { TelegramModule } from './telegram/telegram.module';
import { IndexNowModule } from './index-now/index-now.module';

/**
 * Глобальный инфраструктурный модуль.
 * `@Global()` делает все экспорты доступными во всём приложении.
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    MailModule,
    UploadModule,
    TelegramModule,
    IndexNowModule,
  ],
  exports: [
    PrismaModule,
    MailModule,
    UploadModule,
    TelegramModule,
    IndexNowModule,
  ],
})
export class InfraModule {}
