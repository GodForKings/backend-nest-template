import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SystemSettingModule } from '../api/system-setting/system-setting.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtGuard } from './guards/jwt.guard';
import { MaintenanceGuard } from './guards/maintenance.guard';
import type { StringValue } from 'ms';

/** Глобальный модуль общих утилит.*/
@Global()
@Module({
  imports: [
    /* Модуль защиты от DDoS и Bruteforce */
    ThrottlerModule.forRoot([
      {
        ttl: 60000 /* 60 сек окно */,
        limit: 100 /* 100 запросов с одного IP */,
      },
    ]),
    PassportModule,
    SystemSettingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<StringValue>('JWT_ACCESS_EXPIRES_IN', '2h'),
        },
      }),
    }),
  ],
  providers: [
    JwtStrategy,
    JwtGuard,
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [JwtModule, JwtGuard],
})
export class CommonModule {}
