import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Название категории',
    example: 'Платья',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Уникальный слаг (slug) для URL',
    example: 'platya',
  })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({
    description: 'Путь к изображению или URL категории',
    example: '/uploads/public/platya.jpg',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Статус активности категории',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Порядок сортировки',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'ID родительской категории',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
