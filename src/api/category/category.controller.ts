import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import type { CategoryResponse } from './interfaces';
import { Authorization } from '../../common';
import { Role } from '@prisma/client';

/**
 * Контроллер для работы с категориями.
 * Демонстрирует использование @Authorization(), строгую типизацию ответов
 * и паттерн DTO → Service → Response Interface.
 */
@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  /** Публичный список корневых категорий */
  @Get()
  @ApiOperation({ summary: 'Получить список всех корневых активных категорий' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список категорий успешно получен',
    type: [CategoryResponseDto],
  })
  findAll(): Promise<CategoryResponse[]> {
    return this.categoryService.findAll();
  }

  /** Все категории для панели администратора (включая неактивные) */
  @Authorization(Role.ADMIN)
  @Get('admin/all')
  @ApiOperation({
    summary:
      'Получить все категории без фильтрации по активности (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Все категории успешно получены',
    type: [CategoryResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  findAllAdmin(): Promise<CategoryResponse[]> {
    return this.categoryService.findAllAdmin();
  }

  /** Публичная категория по ЧПУ slug */
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Получить категорию по ЧПУ-ссылке (slug)' })
  @ApiParam({
    name: 'slug',
    description: 'ЧПУ-идентификатор категории',
    example: 'platya-i-sarafany',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно найдена',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  findBySlug(@Param('slug') slug: string): Promise<CategoryResponse> {
    return this.categoryService.findBySlug(slug);
  }

  /** Публичная категория по ID */
  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по её ID' })
  @ApiParam({ name: 'id', description: 'Уникальный идентификатор категории' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно найдена',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  async findOne(@Param('id') id: string): Promise<CategoryResponse> {
    return this.categoryService.findOne(id);
  }

  @Authorization(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Создать новую категорию (Доступ: ADMIN)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Категория успешно создана',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Некорректные входные данные',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Категория с таким slug уже существует',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponse> {
    return this.categoryService.create(dto);
  }

  @Authorization(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию по ID (Доступ: ADMIN)' })
  @ApiParam({ name: 'id', description: 'Уникальный идентификатор категории' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Категория успешно обновлена',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Категория с таким slug уже существует',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponse> {
    return this.categoryService.update(id, dto);
  }

  @Authorization(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить категорию по ID (Доступ: ADMIN)' })
  @ApiParam({ name: 'id', description: 'Уникальный идентификатор категории' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Категория успешно удалена',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Категория не найдена',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Не авторизован',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Недостаточно прав (не ADMIN)',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.categoryService.remove(id);
  }
}
