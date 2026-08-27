import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Role } from '@prisma/client';
import { JwtGuard } from '../guards/jwt.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

/**
 * Универсальный декоратор авторизации.
 *
 * - Без аргументов: только JWT-аутентификация
 * - С ролями: JWT + проверка ролей
 *
 * @example
 * // Только аутентификация
 * @Authorization()
 * @Get('profile')
 * getProfile() { ... }
 *
 * @example
 * // Только ADMIN
 * @Authorization(UserRole.ADMIN)
 * @Get('users')
 * getAllUsers() { ... }
 *
 * @example
 * // ADMIN или USER
 * @Authorization(UserRole.ADMIN, UserRole.USER)
 * @Get('dashboard')
 * getDashboard() { ... }
 */
export const Authorization = (...roles: Role[]) => {
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [UseGuards(JwtGuard), ApiBearerAuth()];

  if (roles.length > 0) {
    decorators.push(Roles(...roles), UseGuards(RolesGuard));
  }

  return applyDecorators(...decorators);
};
