import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import ms, { type StringValue } from 'ms';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  UserResponseDto,
  LoginResponseDto,
  LogoutResponseDto,
  RefreshResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  ValidateResetTokenResponseDto,
} from './dto/auth-response.dto';
import { type JwtPayload, CurrentUser, Authorization } from 'src/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions(expiresIn?: string | number): CookieOptions {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    let maxAge: number | undefined;
    if (typeof expiresIn === 'number') {
      maxAge = expiresIn;
    } else if (typeof expiresIn === 'string') {
      maxAge = ms(expiresIn as StringValue);
    }

    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: cookieDomain || undefined,
      ...(maxAge !== undefined ? { maxAge } : {}),
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

    const accessExpires = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '2h',
    );
    const refreshExpires = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    /* Устанавливаем куку с accessToken */
    response.cookie(
      'accessToken',
      accessToken,
      this.getCookieOptions(accessExpires),
    );

    /* Устанавливаем куку с refreshToken */
    response.cookie(
      'refreshToken',
      refreshToken,
      this.getCookieOptions(refreshExpires),
    );

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

    response.clearCookie('accessToken', this.getCookieOptions());
    response.clearCookie('refreshToken', this.getCookieOptions());
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

    const accessExpires = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '2h',
    );
    const refreshExpires = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    /* Устанавливаем новые куки */
    response.cookie(
      'accessToken',
      tokens.accessToken,
      this.getCookieOptions(accessExpires),
    );

    response.cookie(
      'refreshToken',
      tokens.refreshToken,
      this.getCookieOptions(refreshExpires),
    );

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

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @Authorization()
  @ApiOperation({ summary: 'Обновление профиля текущего пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Профиль успешно обновлен',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Пользователь не авторизован',
  })
  async updateMe(
    @CurrentUser() payload: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateMe(payload.sub, dto);
  }

  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запрос ссылки для восстановления пароля' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Инструкция по восстановлению пароля отправлена',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Get('reset-password/validate')
  @ApiOperation({ summary: 'Проверка валидности токена сброса пароля' })
  @ApiQuery({ name: 'token', description: 'Токен из ссылки сброса пароля' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Результат проверки токена',
    type: ValidateResetTokenResponseDto,
  })
  async validateResetToken(@Query('token') token: string) {
    return this.authService.validateResetToken(token);
  }

  @Throttle({ default: { limit: 2, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Установка нового пароля по токену сброса' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Пароль успешно изменен',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Недействительный или просроченный токен',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
