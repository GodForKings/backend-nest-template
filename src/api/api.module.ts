import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { AuthModule } from './auth/auth.module';
import { SystemSettingModule } from './system-setting/system-setting.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [CategoryModule, AuthModule, SystemSettingModule, UserModule],
})
export class ApiModule {}
