import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Authorization, CurrentUser, type JwtPayload } from '../../common';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import {
  UserAdminResponseDto,
  UsersPaginationResponseDto,
} from './dto/user-admin-response.dto';
import { UserService } from './user.service';

@ApiTags('Users Admin')
@Controller('users')
@Authorization(Role.ADMIN)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary:
      'Получить список всех пользователей с пагинацией и поиском (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список пользователей успешно получен',
    type: UsersPaginationResponseDto,
  })
  findAll(@Query() query: UserQueryDto): Promise<UsersPaginationResponseDto> {
    return this.userService.findAll(query);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Экспорт списка всех пользователей в CSV-файл (Доступ: ADMIN)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Файл с пользователями успешно сгенерирован и отправлен',
  })
  export(@Res() res: Response): Promise<void> {
    return this.userService.exportToCsv(res);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Редактировать данные пользователя (Доступ: ADMIN)',
  })
  @ApiParam({
    name: 'id',
    description: 'Уникальный идентификатор пользователя',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Данные пользователя успешно обновлены',
    type: UserAdminResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Пользователь не найден',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() admin: JwtPayload,
  ): Promise<UserAdminResponseDto> {
    return this.userService.update(id, dto, admin.sub);
  }
}
