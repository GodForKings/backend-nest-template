import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserAdminResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Иван Иванов' })
  name!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+79991234567',
  })
  phone!: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role!: Role;

  @ApiProperty({ example: false })
  isBanned!: boolean;

  @ApiProperty({ example: '2026-06-25T05:50:17.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-25T05:50:17.000Z' })
  updatedAt!: Date;
}

export class UsersPaginationResponseDto {
  @ApiProperty({ type: [UserAdminResponseDto] })
  users!: UserAdminResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
