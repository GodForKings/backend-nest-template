import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Сервис Prisma — обёртка над PrismaClient с pg-адаптером.
 * Реализует OnModuleInit для явного подключения при старте приложения.
 *
 * Использует POSTGRES_URI из переменных окружения (через .env).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.POSTGRES_URI as string,
    });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
