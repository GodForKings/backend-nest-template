import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { InfraModule } from './infra/infra.module';
import { CommonModule } from './common/common.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    /* Глобальный модуль конфигурации */
    ConfigModule.forRoot({ isGlobal: true }),

    /* Модуль раздачи публичной статики */
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads', 'public'),
      serveRoot: '/uploads/public',
    }),

    /* Глобальный инфраструктурный модуль */
    InfraModule,

    /* Глобальный модуль общих утилит */
    CommonModule,

    /* API модуль */
    ApiModule,
  ],
})
export class AppModule {}
