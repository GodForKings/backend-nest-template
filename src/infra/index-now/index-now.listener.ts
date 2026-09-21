import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IndexNowService } from './index-now.service';
import { IndexNowSitemapService } from './index-now-sitemap.service';
import {
  CATEGORY_EVENTS,
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryRemovedEvent,
} from '../../api/category/events';

/**
 * Слушатель событий доменной модели для фоновой отправки ссылок в IndexNow.
 */
@Injectable()
export class IndexNowListener {
  constructor(
    private readonly indexNowService: IndexNowService,
    private readonly sitemapService: IndexNowSitemapService,
  ) {}

  /**
   * Получение базового URL фронтенд-приложения.
   */
  private getBaseUrl(): string {
    return this.sitemapService.getBaseUrl();
  }

  /**
   * Формирование публичного URL категории каталога.
   */
  private buildCategoryUrl(categorySlug: string): string {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/catalog/${categorySlug}`;
  }

  /* СОБЫТИЯ КАТЕГОРИЙ */

  @OnEvent(CATEGORY_EVENTS.CREATED, { async: true })
  handleCategoryCreated(event: CategoryCreatedEvent): void {
    if (!event.isActive) {
      return;
    }

    const categoryUrl = this.buildCategoryUrl(event.slug);
    const catalogRootUrl = `${this.getBaseUrl()}/catalog`;

    this.indexNowService.enqueueUrls([categoryUrl, catalogRootUrl]);
  }

  @OnEvent(CATEGORY_EVENTS.UPDATED, { async: true })
  async handleCategoryUpdated(event: CategoryUpdatedEvent): Promise<void> {
    if (!event.oldIsActive && !event.newIsActive) {
      return;
    }

    const oldUrl = this.buildCategoryUrl(event.oldSlug);
    const newUrl = this.buildCategoryUrl(event.newSlug);

    if (oldUrl !== newUrl) {
      /*
       * Каскадное обновление: при смене слага категории меняются адреса
       * всех привязанных к ней товаров. Оповещаем поисковик об их новых и старых URL.
       */
      const affectedProductUrls =
        await this.sitemapService.getCategoryProductUrls(
          event.newSlug,
          event.oldSlug,
          event.newSlug,
        );

      this.indexNowService.enqueueUrls([
        oldUrl,
        newUrl,
        ...affectedProductUrls,
      ]);
      return;
    }

    this.indexNowService.enqueueUrls([newUrl]);
  }

  @OnEvent(CATEGORY_EVENTS.REMOVED, { async: true })
  handleCategoryRemoved(event: CategoryRemovedEvent): void {
    const url = this.buildCategoryUrl(event.slug);
    this.indexNowService.enqueueUrls([url]);
  }
}
