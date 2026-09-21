import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Authorization } from '../../common';
import { IndexNowService } from './index-now.service';
import { IndexNowSitemapService } from './index-now-sitemap.service';
import {
  IndexNowStatusResponseDto,
  IndexNowSubmitResponseDto,
  SubmitUrlsDto,
} from './dto';
import type { IndexNowConfigStatus, IndexNowSubmitResult } from './interfaces';

/**
 * Контроллер управления интеграцией с протоколом IndexNow.
 * Предоставляет эндпоинты для проверки конфигурации, ручной отправки URL
 * и отправки полной карты сайта в поисковые системы.
 */
@ApiTags('IndexNow')
@Authorization(Role.ADMIN)
@Controller('index-now')
export class IndexNowController {
  constructor(
    private readonly indexNowService: IndexNowService,
    private readonly sitemapService: IndexNowSitemapService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary:
      'Получить текущий статус конфигурации модуля IndexNow (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IndexNowStatusResponseDto,
    description: 'Статус конфигурации успешно получен',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  getStatus(): IndexNowConfigStatus {
    return this.indexNowService.getStatus();
  }

  @Post('submit-urls')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ручная отправка списка URL-адресов в поисковый шлюз IndexNow (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IndexNowSubmitResponseDto,
    description: 'URL-адреса успешно приняты и отправлены',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Ошибка валидации входящего списка или некорректный формат URL',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  async submitUrls(@Body() dto: SubmitUrlsDto): Promise<IndexNowSubmitResult> {
    return this.indexNowService.submitUrlsAdmin(dto.urls);
  }

  @Post('submit-sitemap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Собрать и отправить все активные страницы сайта (sitemap) в IndexNow (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IndexNowSubmitResponseDto,
    description: 'Все страницы сайта успешно собраны и отправлены в IndexNow',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  async submitSitemap(): Promise<IndexNowSubmitResult> {
    return this.sitemapService.submitFullSitemap();
  }
}
