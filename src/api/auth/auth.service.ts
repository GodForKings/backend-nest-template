import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type User, Role, Prisma } from '@prisma/client';
import { hash, compare } from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import ms, { type StringValue } from 'ms';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MailService } from '../../infra/mail/mail.service';
import type { JwtPayload, AuthTokens, GenerateTokensUser } from '../../common';
import type {
  AuthResult,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  UserResponse,
  ValidateResetTokenResponse,
} from './interfaces';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /** Маппинг сущности пользователя БД в изолированный Response-объект */
  toUserResponse(user: User): UserResponse {
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

  /** Хэширование токена с помощью SHA-256 */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Получение срока жизни Refresh токена в миллисекундах из конфигурации */
  private getRefreshTokenTtlMs(): number {
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    return ms(refreshExpiresIn as StringValue);
  }

  /**
   * Получение пользователя по Email.
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Регистрация нового пользователя.
   */
  async register(dto: RegisterDto): Promise<UserResponse> {
    const existingUser = await this.getUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(
        'Пользователь с таким email уже зарегистрирован',
      );
    }

    const hashedPassword = await hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          phone: dto.phone,
          role: Role.USER,
        },
      });

      return this.toUserResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким email уже зарегистрирован',
        );
      }
      throw error;
    }
  }

  /**
   * Регистрация первого администратора (атомарно через транзакцию).
   */
  async registerAdmin(dto: RegisterDto): Promise<UserResponse> {
    const hashedPassword = await hash(dto.password, 10);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const adminExists = await tx.user.findFirst({
          where: { role: Role.ADMIN },
        });

        if (adminExists) {
          throw new ForbiddenException(
            'Регистрация администратора заблокирована: администратор уже существует',
          );
        }

        const existingUser = await tx.user.findUnique({
          where: { email: dto.email },
        });
        if (existingUser) {
          throw new ConflictException(
            'Пользователь с таким email уже зарегистрирован',
          );
        }

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
            phone: dto.phone,
            role: Role.ADMIN,
          },
        });

        return this.toUserResponse(user);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Пользователь с таким email уже зарегистрирован',
        );
      }
      throw error;
    }
  }

  /**
   * Валидация учетных данных при логине.
   */
  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.getUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.isBanned) {
      throw new ForbiddenException(
        'Ваш аккаунт заблокирован. Обратитесь в поддержку.',
      );
    }

    return user;
  }

  /**
   * Вход пользователя в систему (валидация, генерация токенов и сохранение сессии).
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateUser(dto);
    const tokens = await this.generateTokens(user);

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  /**
   * Генерация пары JWT токенов (access и refresh).
   */
  async generateTokens(user: GenerateTokensUser): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<StringValue>(
          'JWT_ACCESS_EXPIRES_IN',
          '2h',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<StringValue>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Сохранение хэша Refresh токена в БД с динамическим сроком жизни.
   */
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Отзыв Refresh токена.
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken
      .delete({
        where: { tokenHash },
      })
      .catch(() => undefined);
  }

  /**
   * Обновление пары токенов по валидному Refresh токену (ротация).
   */
  async refreshTokens(oldRefreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(oldRefreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Недействительный Refresh токен');
    }

    const tokenHash = this.hashToken(oldRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      /* ПОПЫТКА ПОВТОРНОГО ИСПОЛЬЗОВАНИЯ (Replay Attack):
       * Токен валиден по подписи, но отсутствует в БД.
       * Значит, он уже был использован ранее (или скомпрометирован).
       * В целях безопасности отзываем ВСЕ сессии пользователя. */
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException(
        'Сессия скомпрометирована. Пожалуйста, авторизуйтесь заново',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken
        .delete({ where: { id: storedToken.id } })
        .catch(() => undefined);
      throw new UnauthorizedException('Срок действия Refresh токена истек');
    }

    if (storedToken.user.isBanned) {
      throw new ForbiddenException('Аккаунт заблокирован');
    }

    /* Генерируем новую пару токенов */
    const tokens = await this.generateTokens(storedToken.user);
    const newTokenHash = this.hashToken(tokens.refreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenTtlMs());

    /* Атомарно удаляем старый токен и сохраняем новый */
    await this.prisma.$transaction([
      this.prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.userId,
          expiresAt,
        },
      }),
    ]);

    return tokens;
  }

  /**
   * Получение профиля пользователя по ID.
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return this.toUserResponse(user);
  }

  /**
   * Обновление профиля текущего пользователя.
   */
  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserResponse> {
    const dataToUpdate: Prisma.UserUpdateInput = { ...dto };
    let updatedUser: User;

    if (dto.password) {
      dataToUpdate.password = await hash(dto.password, 10);

      const [user] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: dataToUpdate,
        }),
        this.prisma.refreshToken.deleteMany({
          where: { userId },
        }),
      ]);
      updatedUser = user;
    } else {
      updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });
    }

    return this.toUserResponse(updatedUser);
  }

  /**
   * Запрос ссылки для восстановления пароля.
   */
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const user = await this.getUserByEmail(dto.email);

    if (user) {
      /* Удаляем все предыдущие неиспользованные токены сброса */
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      /* Генерируем сырой криптографический токен */
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      /* Сохраняем токен в БД со сроком жизни 1 час */
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.prisma.passwordResetToken.create({
        data: {
          token: tokenHash,
          expiresAt,
          userId: user.id,
        },
      });

      /* Отправляем письмо с сырым токеном */
      await this.mailService.sendResetPasswordEmail(user.email, rawToken);
    }

    /* Всегда возвращаем успешный ответ для безопасности */
    return {
      message:
        'Инструкция по восстановлению пароля отправлена на указанный email',
    };
  }

  /**
   * Проверка токена восстановления пароля.
   */
  async validateResetToken(
    token?: string,
  ): Promise<ValidateResetTokenResponse> {
    if (!token || typeof token !== 'string') {
      return { success: false };
    }

    const tokenHash = this.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Установка нового пароля по токену сброса.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new BadRequestException(
        'Ссылка для сброса пароля недействительна или устарела',
      );
    }

    const hashedPassword = await hash(dto.password, 10);

    /* Обновляем пароль пользователя, помечаем токен использованным и отзываем сессии */
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    return { message: 'Пароль успешно изменен' };
  }
}
