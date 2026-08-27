import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  name?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty({ example: false })
  isBanned!: boolean;

  @ApiProperty({ example: '2026-06-25T05:50:17.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-25T05:50:17.000Z' })
  updatedAt!: Date;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Успешный выход' })
  message!: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({
    example:
      'Инструкция по восстановлению пароля отправлена на указанный email',
  })
  message!: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: 'Пароль успешно изменен' })
  message!: string;
}

export class ValidateResetTokenResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}
