import { Role } from '@prisma/client';

/**
 * Пара токенов авторизации
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Данные пользователя для генерации токенов
 */
export interface GenerateTokensUser {
  id: string;
  email: string;
  role: Role;
}
