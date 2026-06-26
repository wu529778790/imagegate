# Image API Service Design

## Overview

Internal image generation API service with management UI, deployed via Docker. Wraps multiple image provider APIs as HTTP endpoints.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), Ant Design
- **Backend**: Next.js Route Handlers
- **Database**: SQLite via better-sqlite3
- **Providers**: Z.AI, Xiaomi and more
- **Deployment**: Single Docker container

## Database Schema

```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE generation_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key_id INTEGER,
  provider TEXT NOT NULL,
  model TEXT,
  prompt TEXT,
  parameters TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  duration_ms INTEGER,
  image_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## API Endpoints

- `POST /api/generate` - Generate image
- `GET/POST/DELETE /api/keys` - CRUD for API keys
- `GET /api/records` - Query generation records
- `GET /api/stats` - Dashboard statistics

## Pages

- `/` - Dashboard with stats
- `/generate` - Image generation UI
- `/keys` - API key management
- `/records` - Generation history
- `/settings` - Provider configuration
