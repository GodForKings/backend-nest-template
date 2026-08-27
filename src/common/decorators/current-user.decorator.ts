import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Декоратор @CurrentUser() — извлекает JWT-payload из объекта запроса.
 * Доступен только на маршрутах, защищённых @Authorization().
 *
 * @example
 * @Authorization()
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
