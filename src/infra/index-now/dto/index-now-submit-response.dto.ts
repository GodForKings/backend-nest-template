import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { IndexNowSubmitResult } from '../interfaces';

/** DTO ответа на операцию отправки URL-адресов в IndexNow */
export class IndexNowSubmitResponseDto implements IndexNowSubmitResult {
  @ApiProperty({
    description: 'Флаг успешности операции',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Список фактически переданных или обработанных URL-адресов',
    example: [
      'https://example.com/catalog/platya-i-sarafany',
      'https://example.com/catalog/yubki',
    ],
    type: [String],
  })
  submittedUrls!: string[];

  @ApiProperty({
    description: 'Общее количество отправленных URL-адресов',
    example: 2,
  })
  total!: number;

  @ApiProperty({
    description:
      'Флаг симуляции (если вызов выполнен в dev-режиме без обращения к реальному API)',
    example: false,
  })
  simulated!: boolean;

  @ApiPropertyOptional({
    description: 'HTTP-код ответа от поискового шлюза IndexNow',
    example: 200,
  })
  statusCode?: number;

  @ApiPropertyOptional({
    description: 'Информационное сообщение о результате обработки',
    example: 'Успешно отправлено 2 URL в IndexNow',
  })
  message?: string;
}
