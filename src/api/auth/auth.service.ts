import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload, AuthTokens, GenerateTokensUser } from 'src/common';
import { Role, User } from '@prisma/client';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Регистрация нового пользователя
   */
  async register(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.getUserByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: Role.USER,
      },
    });

    // Возвращаем пользователя без хэша пароля
    const { password: _password, ...result } = user;
    return result;
  }

  /**
   * Регистрация первого администратора
   */
  async registerAdmin(dto: RegisterDto): Promise<Omit<User, 'password'>> {
    const adminCount = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });

    if (adminCount > 0) {
      throw new ForbiddenException(
        'Регистрация администратора заблокирована, так как администратор уже существует',
      );
    }

    const existingUser = await this.getUserByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        role: Role.ADMIN,
      },
    });

    const { password: _password, ...result } = user;
    return result;
  }

  /**
   * Валидация пользователя при логине
   */
  async validateUser(dto: LoginDto): Promise<User> {
    const user = await this.getUserByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.isBanned) {
      throw new UnauthorizedException(
        'Ваш аккаунт заблокирован администратором',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return user;
  }

  /**
   * Хеширование токена методом SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Генерация пары токенов (Access & Refresh)
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
   * Сохранение хэша Refresh токена в базу данных
   */
  async saveRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const decodedRaw: unknown = this.jwtService.decode(token);
    const decoded = decodedRaw as { exp?: number } | null;
    let expiresAt: Date;

    if (decoded && typeof decoded.exp === 'number') {
      expiresAt = new Date(decoded.exp * 1000);
    } else {
      /* Фолбек на 7 дней */
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * Отзыв Refresh токена (удаление из БД)
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    try {
      await this.prisma.refreshToken.delete({
        where: { tokenHash },
      });
    } catch {
      /* Игнорируем ошибку, если токена уже нет в базе */
    }
  }

  /**
   * Обновление пары токенов по старому Refresh токену (ротация)
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
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existingToken) {
      /* ПОПЫТКА ПОВТОРНОГО ИСПОЛЬЗОВАНИЯ (Replay Attack):
         Токен валиден по подписи, но отсутствует в БД.
         Значит, он уже был использован ранее (или скомпрометирован).
         В целях безопасности отзываем ВСЕ сессии пользователя. */
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException(
        'Сессия скомпрометирована. Пожалуйста, авторизуйтесь заново',
      );
    }

    // Удаляем старый токен (ротация)
    await this.prisma.refreshToken.delete({
      where: { id: existingToken.id },
    });

    // Получаем пользователя из БД для актуальных данных роли
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.isBanned) {
      throw new UnauthorizedException(
        'Пользователь заблокирован или не найден',
      );
    }

    // Генерируем новую пару
    const tokens = await this.generateTokens(user);

    // Сохраняем новый токен
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Получение профиля текущего пользователя по его ID
   */
  async getMe(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const { password: _password, ...result } = user;
    return result;
  }
}
