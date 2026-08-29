import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { type Prisma, type User } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../common';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import {
  UserAdminResponseDto,
  UsersPaginationResponseDto,
} from './dto/user-admin-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(user: User): UserAdminResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /** Получение списка всех пользователей с пагинацией и поиском */
  async findAll(query: UserQueryDto): Promise<UsersPaginationResponseDto> {
    const rawLimit = query.limit ?? DEFAULT_PAGE_SIZE;
    const limit = Math.min(Math.max(rawLimit, 1), MAX_PAGE_SIZE);
    const page = Math.max(query.page ?? 1, 1);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = query.search
      ? {
          OR: [
            { email: { contains: query.search.trim(), mode: 'insensitive' } },
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { phone: { contains: query.search.trim(), mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: users.map((u) => this.toResponse(u)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Экспорт списка пользователей в формате CSV.
   */
  async exportToCsv(res: Response): Promise<void> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    let csvContent = '\uFEFF';
    csvContent += 'ID;Email;Имя;Телефон;Роль;Статус;Дата регистрации\n';

    for (const user of users) {
      const status = user.isBanned ? 'Заблокирован' : 'Активен';
      const name = user.name ? user.name.replace(/;/g, ' ') : '';
      const phone = user.phone ?? '';
      const createdAt = new Date(user.createdAt).toLocaleDateString('ru-RU');

      csvContent += `${user.id};${user.email};${name};${phone};${user.role};${status};${createdAt}\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users_export.csv"',
    );
    res.status(HttpStatus.OK).send(csvContent);
  }

  /**
   * Обновление данных пользователя администратором.
   */
  async update(
    id: string,
    dto: UpdateUserAdminDto,
    adminId: string,
  ): Promise<UserAdminResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID "${id}" не найден`);
    }

    if (adminId === id && (dto.role === 'USER' || Boolean(dto.isBanned))) {
      throw new BadRequestException(
        'Вы не можете изменить критичные данные своего аккаунта',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        isBanned: dto.isBanned,
      },
    });

    /* При блокировке пользователя отзываем все его refresh-сессии */
    if (dto.isBanned === true) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId: id },
      });
    }

    return this.toResponse(updatedUser);
  }
}
