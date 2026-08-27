# backend-nest-template

Стартовый шаблон NestJS-бэкенда с настроенной инфраструктурой, Prisma ORM, JWT-аутентификацией и строгой типизацией ответов API.

## Технологический стек

| Инструмент | Версия | Назначение |
|---|---|---|
| NestJS | ^11 | Фреймворк |
| Prisma | ^7 | ORM + миграции |
| `@prisma/adapter-pg` | ^7 | Нативный pg-адаптер |
| `@nestjs/passport` + `passport-jwt` | — | JWT-аутентификация |
| `class-validator` | ^0.15 | Валидация DTO |
| `class-transformer` | ^0.5 | Трансформация данных |

---

## Структура проекта

```
src/
├── app.module.ts              # Корневой модуль
├── main.ts                    # Точка входа (ValidationPipe, глобальный префикс /api)
│
├── infra/                     # Инфраструктурный слой (@Global)
│   ├── infra.module.ts        # Реэкспортирует PrismaModule глобально
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts  # PrismaClient + @prisma/adapter-pg + OnModuleInit
│
├── common/                    # Общие утилиты (@Global)
│   ├── common.module.ts       # JwtModule (async), PassportModule, JwtStrategy
│   ├── decorators/
│   │   ├── authorization.decorator.ts  # @Authorization(...roles?) — JWT + RolesGuard
│   │   ├── current-user.decorator.ts   # @CurrentUser() — извлечение req.user
│   │   └── roles.decorator.ts          # @Roles(...roles) — метаданные ролей
│   ├── guards/
│   │   ├── jwt.guard.ts       # JwtGuard extends AuthGuard('jwt')
│   │   └── roles.guard.ts     # RolesGuard — проверка ролей из JWT-payload
│   ├── interfaces/
│   │   └── jwt-payload.interface.ts    # { sub, email, role }
│   └── strategies/
│       └── jwt.strategy.ts    # PassportStrategy(Strategy) — валидация токена
│
└── api/                       # API-слой
    ├── api.module.ts
    └── category/              # Демонстрационный CRUD-модуль
        ├── category.controller.ts
        ├── category.service.ts
        ├── category.module.ts
        ├── dto/
        │   ├── create-category.dto.ts
        │   └── update-category.dto.ts
        └── interfaces/
            └── category-response.interface.ts
```

---

## Быстрый старт

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить переменные окружения

```bash
cp .env.example .env
# Заполни DATABASE_URL, POSTGRES_URI, JWT_SECRET
```

### 3. Сгенерировать Prisma Client

```bash
npm run generate
# или: npx prisma generate
```

### 4. Применить миграции

```bash
npm run migrate
# или: npx prisma migrate dev --name init
```

### 5. Запустить в режиме разработки

```bash
npm run dev
```

Сервер запустится на `http://localhost:5000`. Все маршруты доступны по префиксу `/api`.

---

## Переменные окружения

| Переменная | Пример | Описание |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/db` | Для Prisma CLI (migrate, generate) |
| `POSTGRES_URI` | `postgresql://user:pass@localhost:5432/db` | Для runtime через pg-адаптер |
| `JWT_SECRET` | `super-secret` | Секрет для подписи JWT |
| `JWT_EXPIRES_IN` | `7d` | Срок жизни токена |
| `PORT` | `5000` | Порт сервера |

---

## Паттерны шаблона

### Авторизация

```typescript
// Только JWT (любой аутентифицированный пользователь)
@Authorization()
@Get('profile')
getProfile(@CurrentUser() user: JwtPayload) { ... }

// Только для ADMIN
@Authorization(Role.ADMIN)
@Post()
create(@Body() dto: CreateCategoryDto) { ... }

// ADMIN или USER
@Authorization(Role.ADMIN, Role.USER)
@Get('orders')
getOrders() { ... }
```

### Строгая типизация ответов

```typescript
// Интерфейс ответа — только нужные клиенту поля
export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: CategoryResponse[];
}

// Контроллер возвращает строго типизированный ответ
@Get()
findAll(): Promise<CategoryListResponse> {
  return this.categoryService.findAll();
}
```

### DTO с валидацией

```typescript
export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() slug!: string;
  @IsOptional() @IsUrl()    image?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() parentId?: string;
}
```

---

## Скрипты

```bash
npm run dev         # Запуск с hot-reload
npm run build       # Сборка для продакшена
npm run generate    # npx prisma generate
npm run migrate     # npx prisma migrate dev
npm run lint        # ESLint с авто-фиксом
npm run format      # Prettier
```

---

## Создание нового модуля

При добавлении нового ресурса следуй паттерну модуля `category`:

1. Создай папку `src/api/<resource>/`
2. Добавь `<resource>.module.ts`, `<resource>.controller.ts`, `<resource>.service.ts`
3. Создай `dto/create-<resource>.dto.ts` и `dto/update-<resource>.dto.ts`
4. Создай `interfaces/<resource>-response.interface.ts`
5. Зарегистрируй модуль в `src/api/api.module.ts`

`PrismaService` доступен глобально через `InfraModule` — импортировать в модуль не нужно.
