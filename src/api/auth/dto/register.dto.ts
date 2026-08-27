import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Электронная почта пользователя',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty({ message: 'Email не должен быть пустым' })
  email!: string;

  @ApiProperty({
    description: 'Пароль пользователя (минимум 8 символов)',
    example: 'password123',
    minLength: 8,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @IsNotEmpty({ message: 'Пароль не должен быть пустым' })
  password!: string;

  @ApiPropertyOptional({
    description: 'Имя пользователя',
    example: 'Иван Иванов',
  })
  @IsString({ message: 'Имя должно быть строкой' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Номер телефона',
    example: '+79991234567',
  })
  @IsString({ message: 'Телефон должен быть строкой' })
  @IsOptional()
  phone?: string;
}
