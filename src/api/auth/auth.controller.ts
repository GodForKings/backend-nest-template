import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  UserResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import {
  type JwtPayload,
  CurrentUser,
  Authorization,
  IS_DEV_ENV,
} from 'src/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Пользователь успешно зарегистрирован',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Некорректные данные или email уже занят',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('admin/register')
  @ApiOperation({ summary: 'Регистрация первого администратора' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Администратор успешно зарегистрирован',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description:
      'Регистрация заблокирована, так как администратор уже существует',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Некорректные данные или email уже занят',
  })
  async registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.registerAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Авторизация пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Успешный вход. Токены сохраняются в HTTP-only cookies "accessToken" и "refreshToken"',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Неверные учетные данные',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(dto);
    const { accessToken, refreshToken } =
      await this.authService.generateTokens(user);

    await this.authService.saveRefreshToken(user.id, refreshToken);

    /* Устанавливаем куку с accessToken (2 часа) */
    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    /* Устанавливаем куку с refreshToken (7 дней) */
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: _password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы (очистка cookie)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Успешный выход из системы',
    type: LogoutResponseDto,
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.['refreshToken'] as unknown;
    if (typeof refreshToken === 'string') {
      await this.authService.revokeRefreshToken(refreshToken);
    }

    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
    });
    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
    });
    return { message: 'Успешный выход' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление пары токенов доступа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Токены успешно обновлены в куках',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Недействительный Refresh токен',
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const oldRefreshToken = request.cookies?.['refreshToken'] as unknown;
    if (typeof oldRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh токен не найден в куках');
    }

    const tokens = await this.authService.refreshTokens(oldRefreshToken);

    /* Устанавливаем новые куки */
    response.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });

    response.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: IS_DEV_ENV,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true };
  }

  @Get('me')
  @Authorization()
  @ApiOperation({ summary: 'Получение профиля текущего пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Данные текущего авторизованного пользователя',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Пользователь не авторизован',
  })
  async getMe(@CurrentUser() payload: JwtPayload) {
    return this.authService.getMe(payload.sub);
  }
}
