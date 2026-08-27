/** Интерфейс системных настроек приложения (режим тех. работ и баннер) */
export interface ISystemSetting {
  maintenanceMode: boolean;
  bannerEnabled: boolean;
  bannerText: string;
  bannerLink: string;
}
