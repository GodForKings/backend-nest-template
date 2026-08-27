import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSystemSettingDto {
  @ApiPropertyOptional({
    description: 'Режим технических работ активен',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional({
    description: 'Информационный баннер активен',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  bannerEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Текст баннера',
    example: 'Уважаемые пользователи, 25 июля сайт будет временно недоступен.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerText?: string;

  @ApiPropertyOptional({
    description: 'Ссылка на баннере',
    example: 'https://example.com/maintenance',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerLink?: string;
}
