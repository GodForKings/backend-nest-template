# ============================================================
# Stage 1: builder — устанавливаем зависимости и собираем
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Генерируем Prisma Client (нужен до сборки)
RUN npx prisma generate

# Собираем TypeScript → dist/
RUN npm run build

# Удаляем dev-зависимости после сборки
RUN npm prune --omit=dev

# ============================================================
# Stage 2: runner — финальный образ
# ============================================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Копируем всё из builder (node_modules уже pruned + prisma generated)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 5000

# Применяем миграции и запускаем приложение
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
