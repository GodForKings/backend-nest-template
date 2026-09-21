import type { Role } from '@prisma/client';
import type { AuthTokens } from '../../../common';

/** Базовый профиль пользователя в ответах API */
export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Ответ успешного входа в систему */
export interface LoginResponse {
  user: UserResponse;
}

/** Результат внутренней авторизации сервиса */
export interface AuthResult {
  user: UserResponse;
  tokens: AuthTokens;
}

/** Базовый контракт для текстовых служебных сообщений */
export interface MessageResponse {
  message: string;
}

/** Базовый контракт для статусов булевых операций */
export interface SuccessResponse {
  success: boolean;
}

/** Семантические типы для явных контрактов эндпоинтов */
export type LogoutResponse = MessageResponse;
export type ForgotPasswordResponse = MessageResponse;
export type ResetPasswordResponse = MessageResponse;

export type RefreshResponse = SuccessResponse;
export type ValidateResetTokenResponse = SuccessResponse;
