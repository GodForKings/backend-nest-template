import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import type { CategoryResponse, CategoryDbModel } from './interfaces';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UploadService } from '../../infra/upload/upload.service';
import { slugify } from '../../common';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private toResponse(category: CategoryDbModel): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      children: category.children?.map((child) => this.toResponse(child)),
    };
  }

  private async getById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    return category;
  }

  /**
   * Получение списка всех активных корневых категорий с их подкатегориями (публично).
   */
  async findAll(): Promise<CategoryResponse[]> {
    const items = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });

    return items.map((c) => this.toResponse(c));
  }

  /**
   * Получение всех категорий без фильтрации по активности (для панели администратора).
   */
  async findAllAdmin(): Promise<CategoryResponse[]> {
    const items = await this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });

    return items.map((c) => this.toResponse(c));
  }

  /**
   * Получение категории по ID.
   */
  async findOne(id: string): Promise<CategoryResponse> {
    const category = await this.getById(id);
    return this.toResponse(category);
  }

  /**
   * Получение категории по уникальному ЧПУ slug.
   */
  async findBySlug(slug: string): Promise<CategoryResponse> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true },
    });

    if (!category) {
      throw new NotFoundException(`Категория со slug "${slug}" не найдена`);
    }

    return this.toResponse(category);
  }

  /**
   * Создание новой категории с проверкой уникальности slug.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const targetSlug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.name);

    const existing = await this.prisma.category.findUnique({
      where: { slug: targetSlug },
    });

    if (existing) {
      throw new ConflictException(
        `Категория с ЧПУ-ссылкой "${targetSlug}" уже существует`,
      );
    }

    const category = await this.prisma.category.create({
      data: {
        ...dto,
        slug: targetSlug,
      },
      include: { children: true },
    });

    return this.toResponse(category);
  }

  /**
   * Обновление категории с проверкой уникальности slug и очисткой старых файлов.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    const existing = await this.getById(id);

    let targetSlug: string | undefined;
    if (dto.slug) {
      targetSlug = slugify(dto.slug);
      const existingSlug = await this.prisma.category.findUnique({
        where: { slug: targetSlug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          `Категория с ЧПУ-ссылкой "${targetSlug}" уже существует`,
        );
      }
    }

    if (dto.image !== undefined && dto.image !== existing.image) {
      if (existing.image) {
        await this.uploadService.deleteFile(existing.image);
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        ...(targetSlug ? { slug: targetSlug } : {}),
      },
      include: { children: true },
    });

    return this.toResponse(category);
  }

  /**
   * Удаление категории по ID с очисткой прикрепленного изображения.
   */
  async remove(id: string): Promise<void> {
    const existing = await this.getById(id);

    const hasChildren = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (hasChildren > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию, у которой есть подкатегории. Сначала удалите или смените родительскую категорию!',
      );
    }

    await this.prisma.category.delete({ where: { id } });

    if (existing.image) {
      await this.uploadService.deleteFile(existing.image);
    }
  }
}
