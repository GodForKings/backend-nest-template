import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IndexNowService } from './index-now.service';
import type { IndexNowSubmitResult } from './interfaces';

/**
 * Доменный агрегатор карты сайта для модуля IndexNow.
 * Изолирует знание о структуре базы данных (Prisma) от транспортного протокола IndexNow.
 */
@Injectable()
export class IndexNowSitemapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly indexNowService: IndexNowService,
  ) {}

  /**
   * Получение базового адреса фронтенда.
   */
  getBaseUrl(): string {
    const rawUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('SITE_URL') ||
      'https://example.com';

    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return `https://${cleanUrl}`;
    }

    return cleanUrl;
  }

  /**
   * Получение списка всех URL товаров конкретной категории (старых и новых) при смене её слага.
   */
  async getCategoryProductUrls(
    categoryIdOrNewSlug: string,
    oldCategorySlug: string,
    newCategorySlug: string,
  ): Promise<string[]> {
    const baseUrl = this.getBaseUrl();

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        category: {
          slug: newCategorySlug,
        },
      },
      select: { slug: true },
    });

    const urls: string[] = [];
    for (const p of products) {
      /* Добавляем старый URL товара, который теперь должен стать редиректом или 404 */
      urls.push(`${baseUrl}/catalog/${oldCategorySlug}/${p.slug}`);
      /* Добавляем актуальный новый URL товара */
      urls.push(`${baseUrl}/catalog/${newCategorySlug}/${p.slug}`);
    }

    return urls;
  }

  /**
   * Сбор полного списка активных страниц ресурса и их отправка в IndexNow.
   */
  async submitFullSitemap(): Promise<IndexNowSubmitResult> {
    const baseUrl = this.getBaseUrl();

    /* Основные статические страницы сайта */
    const staticUrls = [
      `${baseUrl}`,
      `${baseUrl}/catalog`,
      `${baseUrl}/about`,
      `${baseUrl}/delivery`,
      `${baseUrl}/faq`,
      `${baseUrl}/contacts`,
    ];

    /* Загрузка всех активных сущностей из базы данных */
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          category: { select: { slug: true } },
        },
      }),
    ]);

    const categoryUrls = categories.map(
      (cat) => `${baseUrl}/catalog/${cat.slug}`,
    );

    const productUrls = products.map((prod) => {
      const catSlug = prod.category?.slug || 'all';
      return `${baseUrl}/catalog/${catSlug}/${prod.slug}`;
    });

    const allUrls = [...staticUrls, ...categoryUrls, ...productUrls];

    return this.indexNowService.submitUrlsAdmin(allUrls);
  }
}
