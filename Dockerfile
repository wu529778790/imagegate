FROM node:20-slim

WORKDIR /app

# Install better-sqlite3 build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Copy public directory to standalone output
RUN cp -r public .next/standalone/public

# Copy static files to standalone output
RUN cp -r .next/static .next/standalone/.next/static

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/magicbrush.db

CMD ["node", ".next/standalone/server.js"]
