import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Модуль Prisma - предоставляет и экспортирует PrismaService.
 * Импортируется через InfraModule (глобальный). */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
