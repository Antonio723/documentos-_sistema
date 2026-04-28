# ── Builder ─────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# 🔥 ADICIONE ISSO
RUN apt-get update -y && apt-get install -y openssl

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


# ── Production ──────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# 🔥 ADICIONE ISSO
RUN apt-get update -y && apt-get install -y openssl

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nodejs

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]