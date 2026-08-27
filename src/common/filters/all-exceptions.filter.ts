import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ValidationErrorResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * Глобальный фильтр всех исключений приложения.
 * Форматирует любые ошибки в единый стандартизированный JSON-ответ.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as ValidationErrorResponse;
        if (Array.isArray(body.message)) {
          message = 'Ошибка валидации входных данных';
          errors = body.message;
        } else if (typeof body.message === 'string') {
          message = body.message;
        } else if (body.error) {
          message = body.error;
        }
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
