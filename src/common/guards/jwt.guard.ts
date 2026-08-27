import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Страж JwtGuard — проверяет Bearer-токен из заголовка Authorization.
 * Использует стратегию 'jwt' (passport-jwt), зарегистрированную в JwtModule.
 * При успешной валидации добавляет payload в req.user.
 */
@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
