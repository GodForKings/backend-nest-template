import { Module } from '@nestjs/common';
import { CategoryModule } from './category/category.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [CategoryModule, AuthModule],
})
export class ApiModule {}
