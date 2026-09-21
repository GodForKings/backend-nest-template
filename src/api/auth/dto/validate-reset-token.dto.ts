import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateResetTokenDto {
  @ApiProperty({
    description: 'Токен сброса пароля из ссылки',
    example: 'a6b8c9d0...',
  })
  @IsString({ message: 'Токен должен быть строкой' })
  @IsNotEmpty({ message: 'Токен не должен быть пустым' })
  token!: string;
}
