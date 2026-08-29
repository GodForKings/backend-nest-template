import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { SystemSettingService } from '../../api/system-setting/system-setting.service';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Глобальный страж технических работ.
 * Если активирован режим тех. работ:
 * - Разрешает любые запросы пользователей с ролью ADMIN.
 * - Разрешает доступ к критически важным роутам (авторизация, проверка статуса).
 * - Блокирует все остальные запросы с ошибкой 503 Service Unavailable.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  /* Список URL-исключений, которые доступны во время тех. работ */
  private readonly allowedUrls = [
    '/api/system-settings/maintenance',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/auth/admin/register',
  ];

  constructor(
    private readonly systemSettingService: SystemSettingService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private extractToken(request: Request): string | null {
    if (request && request.cookies) {
      const token = request.cookies['accessToken'] as unknown;
      if (typeof token === 'string') {
        return token;
      }
    }
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  canActivate(context: ExecutionContext): boolean {
    /* 1. Если режим тех. работ выключен - пропускаем */
    if (!this.systemSettingService.isMaintenanceModeEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const url = request.url;

    /* 2. Если URL находится в списке разрешенных исключений - пропускаем */
    const isAllowedUrl = this.allowedUrls.some((allowedUrl) =>
      url.split('?')[0].endsWith(allowedUrl),
    );
    if (isAllowedUrl) {
      return true;
    }

    /* 3. Проверяем, является ли пользователь администратором */
    const token = this.extractToken(request);
    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });

        if (payload && payload.role === Role.ADMIN) {
          return true; /* Администраторам доступ разрешен везде */
        }
      } catch {
        /* Игнорируем ошибку парсинга токена, пользователь считается неавторизованным */
      }
    }

    /* 4. Во всех остальных случаях блокируем запрос */
    throw new ServiceUnavailableException(
      'Сервер находится на техническом обслуживании. Пожалуйста, попробуйте позже.',
    );
  }
}
