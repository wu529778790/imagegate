# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p data
RUN npm run build
RUN npm prune --production

# Stage 2: Production
FROM node:20-slim

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/imagegate.db

CMD ["node", "server.js"]
