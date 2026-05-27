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

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/image-api.db

CMD ["npm", "start"]
