import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponse } from './interfaces/category-response.interface';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(category: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    isActive: boolean;
    sortOrder: number;
    children?: Array<{
      id: string;
      name: string;
      slug: string;
      image: string | null;
      isActive: boolean;
      sortOrder: number;
    }>;
  }): CategoryResponse {
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

  async findAll(): Promise<CategoryResponse[]> {
    const items = await this.prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });

    return items.map((c) => this.toResponse(c));
  }

  async findOne(id: string): Promise<CategoryResponse> {
    const category = await this.getById(id);
    return this.toResponse(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponse> {
    const category = await this.prisma.category.create({
      data: dto,
      include: { children: true },
    });

    return this.toResponse(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponse> {
    await this.getById(id);
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
      include: { children: true },
    });

    return this.toResponse(category);
  }

  async remove(id: string): Promise<void> {
    await this.getById(id);
    await this.prisma.category.delete({ where: { id } });
  }
}
