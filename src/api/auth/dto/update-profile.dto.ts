import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Имя пользователя',
    example: 'Александр',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Телефон пользователя',
    example: '+79991234567',
  })
  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Неверный формат телефона' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Новый пароль',
    example: 'newStrongPassword123',
    minLength: 8,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password?: string;
}
