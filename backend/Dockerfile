# ── Builder ─────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Gera o client do Prisma
RUN npx prisma generate

# Build do projeto
RUN npm run build


# ── Production ──────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Cria usuário não-root
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nodejs

# Copia apenas o necessário
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Ajusta permissões
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start com migrate
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]