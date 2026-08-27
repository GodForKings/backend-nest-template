import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfraModule } from './infra/infra.module';
import { CommonModule } from './common/common.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    /* Глобальный модуль конфигурации */
    ConfigModule.forRoot({ isGlobal: true }),

    /* Глобальный инфраструктурный модуль */
    InfraModule,

    /* Глобальный модуль общих утилит */
    CommonModule,

    /* API модуль */
    ApiModule,
  ],
})
export class AppModule {}
