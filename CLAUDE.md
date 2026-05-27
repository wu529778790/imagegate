# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

Internal image generation API service with management UI. Wraps AI image providers (Z.AI/Zhipu, Xiaomi) behind HTTP endpoints, backed by SQLite.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Framework:** Next.js 16 (App Router), Ant Design 6, Tailwind CSS 4

**Database:** SQLite via `better-sqlite3`, stored at `DATABASE_URL` (format: `file:/path`) or defaults to `data/image-api.db`. Tables: `api_keys`, `generation_records`, `settings`.

**Provider pattern:** Each image provider implements `ImageProvider` interface in `src/providers/types.ts`. Providers are registered in `src/providers/index.ts` factory. Current implementations: `zai.ts` (Zhipu), `xiaomi.ts`.

**API routes** in `src/app/api/`:

- `POST /api/generate` — generate image (accepts prompt, provider, model, ar, quality; returns base64 PNG)
- `GET/POST /api/keys` — list/add API keys
- `DELETE/PATCH /api/keys/[id]` — delete/toggle key
- `GET /api/records` — query generation records (pagination, filters)
- `GET/POST /api/settings` — read/write app settings
- `GET /api/stats` — dashboard statistics

**Frontend pages** in `src/app/`: dashboard (`/`), generate (`/generate`), keys (`/keys`), records (`/records`), settings (`/settings`). All client-rendered with `"use client"`.

**Data layer:** `src/lib/db.ts` handles all SQLite operations (schema init, CRUD, stats).

## Key Technical Details

- Path alias: `@/*` maps to `./src/*`
- API keys and provider base URLs are managed through the UI, not environment variables
- Docker deployment: `docker-compose up`, mounts `./data` volume for SQLite persistence
- Native module: `better-sqlite3` requires build tools (python3, make, g++) in Docker

## Adding a New Provider

1. Create `src/providers/newprovider.ts` implementing `ImageProvider` interface
2. Register in `src/providers/index.ts` factory
3. Add to provider/model type lists in frontend pages (`generate/page.tsx`, `settings/page.tsx`)
