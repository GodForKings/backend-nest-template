import {
  Injectable,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import type { SystemSetting } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpdateSystemSettingDto } from './dto/update-system-setting.dto';
import type { ISystemSetting } from './interfaces/system-setting.interface';

@Injectable()
export class SystemSettingService implements OnModuleInit {
  private maintenanceMode = false;
  private bannerEnabled = false;
  private bannerText = '';
  private bannerLink = '';

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSettingsExist();
    await this.loadSettings();
  }

  /** Гарантирует наличие единственной (Singleton) записи настроек в БД */
  private async ensureSettingsExist(): Promise<void> {
    try {
      await this.prisma.systemSetting.upsert({
        where: { id: 'global' },
        update: {},
        create: {
          id: 'global',
          maintenanceMode: false,
          bannerEnabled: false,
          bannerText: '',
          bannerLink: '',
        },
      });
    } catch {
      throw new InternalServerErrorException(
        'Ошибка базы данных при создании глобальных настроек',
      );
    }
  }

  /** Загружает системные настройки из базы данных в локальную память. */
  private async loadSettings(): Promise<void> {
    try {
      const settings: SystemSetting | null =
        await this.prisma.systemSetting.findUnique({
          where: { id: 'global' },
        });

      if (settings) {
        this.maintenanceMode = settings.maintenanceMode;
        this.bannerEnabled = settings.bannerEnabled;
        this.bannerText = settings.bannerText;
        this.bannerLink = settings.bannerLink;
      }
    } catch {
      throw new InternalServerErrorException(
        'Ошибка базы данных при загрузке настроек',
      );
    }
  }

  /**
   * Проверяет, активен ли режим технических работ (без обращения к БД).
   */
  isMaintenanceModeEnabled(): boolean {
    return this.maintenanceMode;
  }

  /**
   * Возвращает текущее состояние тех. работ и баннера.
   */
  getSettings(): ISystemSetting {
    return {
      maintenanceMode: this.maintenanceMode,
      bannerEnabled: this.bannerEnabled,
      bannerText: this.bannerText,
      bannerLink: this.bannerLink,
    };
  }

  /**
   * Обновляет настройки в БД и в локальной памяти.
   */
  async updateSettings(dto: UpdateSystemSettingDto): Promise<ISystemSetting> {
    try {
      const settings: SystemSetting = await this.prisma.systemSetting.update({
        where: { id: 'global' },
        data: {
          maintenanceMode: dto.maintenanceMode,
          bannerEnabled: dto.bannerEnabled,
          bannerText: dto.bannerText,
          bannerLink: dto.bannerLink,
        },
      });

      this.maintenanceMode = settings.maintenanceMode;
      this.bannerEnabled = settings.bannerEnabled;
      this.bannerText = settings.bannerText;
      this.bannerLink = settings.bannerLink;

      return this.getSettings();
    } catch {
      throw new InternalServerErrorException(
        'Не удалось обновить системные настройки в базе данных',
      );
    }
  }
}
