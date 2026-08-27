import { ApiProperty } from '@nestjs/swagger';
import type { ISystemSetting } from '../interfaces/system-setting.interface';

export class SystemSettingResponseDto implements ISystemSetting {
  @ApiProperty({
    description: 'Режим технических работ активен',
    example: false,
  })
  maintenanceMode!: boolean;

  @ApiProperty({
    description: 'Информационный баннер активен',
    example: false,
  })
  bannerEnabled!: boolean;

  @ApiProperty({
    description: 'Текст баннера',
    example: 'Уважаемые пользователи, 25 июля сайт будет временно недоступен.',
  })
  bannerText!: string;

  @ApiProperty({
    description: 'Ссылка на баннере',
    example: 'https://example.com/maintenance',
  })
  bannerLink!: string;
}
