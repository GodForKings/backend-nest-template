import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Декоратор для извлечения реального IP-адреса клиента.
 * Корректно работает за Reverse Proxy (Nginx, Cloudflare) и напрямую */
export const DeviceIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }

    return (
      request.ips?.[0] ||
      request.ip ||
      request.socket?.remoteAddress ||
      '127.0.0.1'
    );
  },
);
