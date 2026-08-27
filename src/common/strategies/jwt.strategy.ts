import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from 'src/common';

/**
 * JWT-стратегия Passport.
 * Извлекает токен из cookies (accessToken) или из заголовка Authorization: Bearer <token>.
 * Валидирует его с помощью секрета JWT_SECRET из .env. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          if (request && request.cookies) {
            const token = request.cookies['accessToken'] as unknown;
            if (typeof token === 'string') {
              return token;
            }
          }
          return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Вызывается после успешной верификации токена.
   * Возвращаемый объект записывается в req.user.
   */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
