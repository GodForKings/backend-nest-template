# Backend NestJS + Prisma Template (2026)

Современный, масштабируемый и готовый к продакшену шаблон бэкенда на **NestJS 11** и **Prisma ORM 7** (PostgreSQL), построенный по строгим стандартам code-style, безопасности и модульной архитектуры.

---

## 🛠 Технологический стек

- **Фреймворк**: [NestJS 11](https://nestjs.com/) (Express, `@nestjs/swagger`, `@nestjs/throttler`, `@nestjs/serve-static`)
- **База данных & ORM**: [Prisma ORM 7](https://www.prisma.io/) + `@prisma/adapter-pg` + PostgreSQL 16
- **Аутентификация**: JWT (Access 2h + Refresh 7d в безопасных HTTP-Only Cookies), Passport.js, `bcrypt`, `argon2`
- **Валидация & DTO**: `class-validator` + `class-transformer` + Swagger Decorators
- **Уведомления**: Telegram Bot ([Telegraf](https://telegrafjs.org/)) + Email ([Resend](https://resend.com/))
- **Безопасность**: Защита от DDoS/Bruteforce (`ThrottlerGuard` + `@Throttle`), `trust proxy`, безопасные `CookieOptions`, защита от IDOR, `enableShutdownHooks`
- **Контейнеризация**: Изолированный `docker-compose.yml` (PostgreSQL на порту `5437`, приложение на порту `5001`)

---

## 📁 Архитектура проекта

```text
src/
├── app.module.ts              # Корневой модуль (Config, ServeStatic, Infra, Common, Api)
├── main.ts                    # Точка входа (ValidationPipe, trust proxy, CORS, Swagger, cookies, shutdown hooks)
│
├── infra/                     # Глобальный инфраструктурный слой (@Global)
│   ├── infra.module.ts        # Реэкспортирует PrismaModule, MailModule, UploadModule, TelegramModule
│   ├── prisma/                # PrismaClient + OnModuleInit + OnModuleDestroy (Graceful Shutdown)
│   ├── mail/                  # Почтовый сервис (Resend, шаблоны сброса пароля)
│   ├── telegram/              # Сервис Telegram-бота (Telegraf, уведомления, экранирование HTML)
│   └── upload/                # Загрузка и раздача файлов (/uploads/public и /uploads/private)
│
├── common/                    # Глобальные утилиты и безопасность (@Global)
│   ├── common.module.ts       # ThrottlerModule, JwtModule, MaintenanceGuard
│   ├── config/                # Конфигурации Swagger и CORS
│   ├── constants/             # Константы пагинации (DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
│   ├── decorators/            # @Authorization(), @CurrentUser(), @Roles(), @DeviceIp()
│   ├── dto/                   # Базовый PaginationQueryDto
│   ├── filters/               # Глобальный AllExceptionsFilter
│   ├── guards/                # JwtGuard, MaintenanceGuard, ThrottlerGuard
│   ├── interfaces/            # JwtPayload
│   ├── strategies/            # JwtStrategy
│   └── utils/                 # slugify, is-dev
│
└── api/                       # API-модули
    ├── api.module.ts          # Регистрация всех контроллеров и сервисов
    ├── auth/                  # Модуль аутентификации (вход, регистрация, сброс пароля, профиль)
    ├── system-setting/        # Режим тех. работ (MaintenanceGuard) и информационный баннер
    ├── user/                  # Управление пользователями для админ-панели (бан, роли, пагинация, экспорт)
    └── category/              # Демонстрационный CRUD-модуль (ЧПУ-поиск, slugify, иерархия)
```

---

## 💎 Готовые функциональные модули

### 1. Модуль аутентификации (`api/auth`)

- `POST /api/auth/register` - регистрация нового пользователя (роль `USER`).
- `POST /api/auth/admin/register` - одноразовая регистрация первого администратора (`ADMIN`).
- `POST /api/auth/login` - вход в систему с выдачей `accessToken` (2h) и `refreshToken` (7d) в защищенных cookies. Защищен лимитом `@Throttle`.
- `POST /api/auth/logout` - безопасный выход и отзыв токенов.
- `POST /api/auth/refresh` - обновление пары токенов.
- `GET /api/auth/me` - получение профиля текущего пользователя.
- `PATCH /api/auth/me` - обновление имени, телефона и пароля.
- `POST /api/auth/forgot-password` - запрос одноразовой ссылки для сброса пароля.
- `GET /api/auth/reset-password/validate?token=...` - проверка валидности токена сброса.
- `POST /api/auth/reset-password` - атомарная смена пароля с инвалидацией токена.

### 2. Системные настройки и режим тех. работ (`api/system-setting`)

- `GET /api/system-settings/maintenance` - публичный эндпоинт статуса тех. работ и баннера.
- `PATCH /api/system-settings/maintenance` - изменение настроек (доступно только `ADMIN`).
- **In-Memory кэширование**: глобальный `MaintenanceGuard` проверяет состояние сервера за 0 мс без нагрузки на базу данных.

### 3. Управление пользователями (`api/user`)

- `GET /api/users` - список пользователей с поиском и пагинацией (лимит 100).
- `PATCH /api/users/:id` - блокировка (`isBanned`), изменение роли (`ADMIN`/`USER`).
- `GET /api/users/export` - экспорт базы пользователей в CSV.

### 4. Хранилище и загрузка файлов (`infra/upload`)

- `POST /api/upload/image` - загрузка публичных изображений с проверкой MIME-типов (раздаются по `/uploads/public/...`).
- `POST /api/upload/file` - загрузка приватных документов (PDF, ZIP, DOC).
- `DELETE /api/upload/file` - удаление файлов с диска.

### 5. Telegram-бот (`infra/telegram`)

- `TelegramService` доступен глобально во всех модулях.
- Метод `sendNotification({ title, message, fields })` для красивых HTML-уведомлений о заказах, заявках и ошибках.

---

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Запуск изолированной базы данных

```bash
docker compose up -d postgres
```

_(База PostgreSQL запустится на порту `5437`)_

### 3. Настройка переменных окружения

Создайте `.env` файл на основе `.env.example`:

```env
PORT=5001
NODE_ENV=development

POSTGRES_USER=template_user
POSTGRES_PASSWORD=template_pass
POSTGRES_DB=template_db
POSTGRES_PORT=5437
POSTGRES_URI=postgresql://template_user:template_pass@localhost:5437/template_db?schema=public

JWT_ACCESS_SECRET=super-secret-access-dev-key
JWT_REFRESH_SECRET=super-secret-refresh-dev-key

FRONTEND_URL=http://localhost:3044
CORS_ORIGINS=http://localhost:3044,http://localhost:3000
COOKIE_DOMAIN=localhost

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 4. Применение схемы базы данных

```bash
npx prisma db push
# или: npm run migrate
```

### 5. Запуск в режиме разработки

```bash
npm run dev
```

Сервер запустится на [http://localhost:5001](http://localhost:5001).
Интерактивная документация Swagger UI доступна по адресу: **[http://localhost:5001/swagger](http://localhost:5001/swagger)**.
