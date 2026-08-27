import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteFileQueryDto {
  @ApiProperty({
    description: 'Относительный путь или абсолютный URL файла для удаления',
    example: '/uploads/public/file.jpg',
  })
  @IsString({ message: 'Путь к файлу должен быть строкой' })
  @IsNotEmpty({ message: 'Путь к файлу не должен быть пустым' })
  filePath!: string;
}
