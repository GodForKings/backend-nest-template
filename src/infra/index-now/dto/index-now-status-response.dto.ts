import { ApiProperty } from '@nestjs/swagger';
import type { IndexNowConfigStatus } from '../interfaces';

/** DTO ответа со статусом конфигурации шлюза IndexNow */
export class IndexNowStatusResponseDto implements IndexNowConfigStatus {
  @ApiProperty({
    description: 'Включена ли боевая отправка в IndexNow',
    example: true,
  })
  enabled!: boolean;

  @ApiProperty({
    description: 'Определено ли текущее окружение как разработка (development)',
    example: false,
  })
  isDev!: boolean;

  @ApiProperty({
    description: 'Сконфигурированный публичный хост сайта',
    example: 'example.com',
  })
  host!: string;

  @ApiProperty({
    description: 'Задан ли ключ верификации протокола',
    example: true,
  })
  hasKey!: boolean;

  @ApiProperty({
    description:
      'URL-адрес размещения файла ключа на сайте для поисковых ботов',
    example: 'https://example.com/d9a8f237bc8e412699f81a7d65c3b1e0.txt',
  })
  keyLocation!: string;
}
