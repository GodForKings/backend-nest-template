import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtGuard } from './guards/jwt.guard';
import type { StringValue } from 'ms';

/**
 * Глобальный модуль общих утилит.
 * Регистрирует PassportModule, JwtModule (async, из ConfigService),
 * JwtStrategy и экспортирует JwtGuard для использования в других модулях.
 */
@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<StringValue>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtGuard],
  exports: [JwtModule, JwtGuard],
})
export class CommonModule {}
