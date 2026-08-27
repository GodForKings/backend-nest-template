import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Сервис Prisma - обёртка над PrismaClient с pg-адаптером.
 * Реализует OnModuleInit для явного подключения и OnModuleDestroy для graceful shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.POSTGRES_URI as string,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      /* Выполняем тестовый запрос, так как подключение происходит лениво */
      await this.$queryRawUnsafe('SELECT 1');
      Logger.log('Успешное подключение к БД PostgreSQL', PrismaService.name);
    } catch (error) {
      Logger.error(
        `Не удалось подключиться к базе данных: ${(error as Error).message}`,
        PrismaService.name,
      );
      throw new Error(
        `Не удалось подключиться к базе данных PostgreSQL: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    Logger.log(
      'Соединение с БД PostgreSQL корректно закрыто',
      PrismaService.name,
    );
  }
}
