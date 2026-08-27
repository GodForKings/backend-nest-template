import { Global, Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Глобальный инфраструктурный модуль.
 * `@Global()` делает все экспорты доступными во всём приложении
 * без необходимости явно импортировать PrismaModule в каждый модуль.
 */
@Global()
@Module({
  imports: [PrismaModule],
  exports: [PrismaModule],
})
export class InfraModule {}
