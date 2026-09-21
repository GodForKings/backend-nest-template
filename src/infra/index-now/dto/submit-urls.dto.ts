import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUrl } from 'class-validator';

/** Входное DTO для ручной отправки списка URL в протокол IndexNow */
export class SubmitUrlsDto {
  @ApiProperty({
    description: 'Массив абсолютных публичных URL-адресов для индексации',
    example: [
      'https://example.com/catalog/platya-i-sarafany',
      'https://example.com/catalog/yubki',
    ],
    type: [String],
  })
  @IsArray({ message: 'Поле urls должно быть массивом строк' })
  @ArrayNotEmpty({ message: 'Массив urls не может быть пустым' })
  @ArrayMaxSize(10000, {
    message: 'Максимальный размер пакета составляет 10 000 URL за один запрос',
  })
  @IsUrl(
    { require_protocol: true },
    {
      each: true,
      message:
        'Каждый элемент массива должен являться корректным абсолютным URL (например, https://example.com/page)',
    },
  )
  urls!: string[];
}
