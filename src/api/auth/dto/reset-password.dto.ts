import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Токен сброса пароля, полученный из письма',
    example: 'a6b8c9d0...',
  })
  @IsString({ message: 'Токен должен быть строкой' })
  @IsNotEmpty({ message: 'Токен не должен быть пустым' })
  token!: string;

  @ApiProperty({
    description: 'Новый пароль пользователя (минимум 8 символов)',
    example: 'newpassword123',
    minLength: 8,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @IsNotEmpty({ message: 'Пароль не должен быть пустым' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password!: string;
}
