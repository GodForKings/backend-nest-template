import { Module } from '@nestjs/common';
import { SystemSettingController } from './system-setting.controller';
import { SystemSettingService } from './system-setting.service';

/** Модуль системных настроек (режим тех. работ и информационный баннер) */
@Module({
  controllers: [SystemSettingController],
  providers: [SystemSettingService],
  exports: [SystemSettingService],
})
export class SystemSettingModule {}
