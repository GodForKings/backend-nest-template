import { Role } from '@prisma/client';

/**
 * Интерфейс payload JWT-токена.
 * Содержит минимально необходимые данные для идентификации пользователя.
 */
export interface JwtPayload {
  /** UUID пользователя из таблицы users */
  sub: string;
  /** Email пользователя */
  email: string;
  /** Роль: USER | ADMIN */
  role: Role;
}
