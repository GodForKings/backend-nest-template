import { Module } from '@nestjs/common';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

/**
 * Демонстрационный модуль Category.
 * PrismaService не нужно импортировать — он доступен глобально через InfraModule.
 */
@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
