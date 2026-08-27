import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class UpdateUserAdminDto {
  @ApiPropertyOptional({
    description: 'Имя пользователя',
    example: 'Иван Иванов',
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
    enum: Role,
    description: 'Роль пользователя',
    example: Role.USER,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Некорректная роль' })
  role?: Role;

  @ApiPropertyOptional({
    description: 'Статус блокировки пользователя',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;
}
