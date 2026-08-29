import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Authorization } from '../../common';
import { SystemSettingService } from './system-setting.service';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import { SystemSettingResponseDto } from './dto/system-setting-response.dto';
import type { ISystemSetting } from './interfaces/system-setting.interface';

@ApiTags('System Settings')
@Controller('system-settings')
export class SystemSettingController {
  constructor(private readonly systemSettingService: SystemSettingService) {}

  @Get('maintenance')
  @ApiOperation({
    summary: 'Получить настройки режима тех. работ и информационного баннера',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Настройки успешно получены',
    type: SystemSettingResponseDto,
  })
  getMaintenanceStatus(): ISystemSetting {
    return this.systemSettingService.getSettings();
  }

  @Authorization(Role.ADMIN)
  @Patch('maintenance')
  @ApiOperation({
    summary: 'Изменить настройки тех. работ и баннера (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Настройки успешно обновлены',
    type: SystemSettingResponseDto,
  })
  async updateMaintenanceStatus(
    @Body() dto: UpdateSystemSettingDto,
  ): Promise<ISystemSetting> {
    return this.systemSettingService.updateSettings(dto);
  }
}
