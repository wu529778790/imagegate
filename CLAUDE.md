# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Next.js Version Note

This project uses Next.js 16, which has breaking changes from earlier versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Project Overview

AI image generation service (ImageGate) with management UI. Wraps 10 AI image providers behind HTTP endpoints, backed by SQLite. Features GitHub OAuth login, encrypted API key storage, background image sync to GitHub, and structured logging. All UI text is in Chinese (zh-CN).

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server (node .next/standalone/server.js)
npm run lint         # ESLint
npm run test         # Jest (48 tests)
npm run test:watch   # Jest in watch mode
npm run test:coverage # Jest with coverage
```

## Architecture

**Framework:** Next.js 16 (App Router), React 19, Ant Design 6, Tailwind CSS 4

**Database:** SQLite via `better-sqlite3`. Singleton in `src/lib/db.ts` with WAL mode and foreign keys. Stored at `DATABASE_URL` (format: `file:/path`) or defaults to `data/imagegate.db`. Five tables: `api_keys`, `generation_records`, `settings`, `users`, `images`. On startup, records stuck in "pending" for >10 minutes are auto-marked "failed".

**Auth:** NextAuth.js v5 beta with GitHub OAuth (`src/lib/auth.ts`). Middleware in `src/middleware.ts` protects routes via session cookie — public routes include `/login`, `/api/auth`, `/api/generate`, and several others; protected routes redirect to `/login` (pages) or return 401 (API).

**Encryption:** All API keys (both `api_keys` table and `{provider}_api_key` settings) are encrypted with AES-256-GCM before storage (`src/lib/crypto.ts`). The `ENCRYPTED_SETTINGS_KEYS` list in `db.ts` defines which settings keys get encrypted.

**Provider pattern:** Each image provider implements `ImageProvider` interface (`src/providers/types.ts`), returning `Promise<Buffer>` (PNG bytes). `BaseProvider` abstract class (`src/providers/base.ts`) provides OpenAI-compatible defaults. Factory registry in `src/providers/index.ts` exposes `createProvider(name, config?)` and `generateImage()` wrapper. Providers:

| Provider | File | Default Model | Notes |
|---|---|---|---|
| Z.AI (智谱) | `zai.ts` | cogview-3 | JWT auth, two model families |
| OpenAI | `openai.ts` | gpt-image-2 | Extends OpenAI-compatible |
| Google | `google.ts` | gemini-2.0-flash-preview-image-generation | Gemini-specific format |
| OpenRouter | `openrouter.ts` | google/gemini-2.0-flash-preview-image-generation | Multi-model gateway |
| Dashscope (通义) | `dashscope.ts` | qwen-image-2.0-pro | Async task polling |
| MiniMax | `minimax.ts` | image-01 | Unified error handling |
| Replicate | `replicate.ts` | google/nano-banana-2 | Async task polling |
| Jimeng (即梦) | `jimeng.ts` | jimeng_t2i_v40 | Async task polling |
| Seedream (豆包) | `seedream.ts` | doubao-seedream-5-0-260128 | Size normalization |
| Azure | `azure.ts` | gpt-image-2 | Azure-specific config |

**Image sync:** `src/lib/github.ts` handles GitHub API operations (auto-create `imagegate-images` repo, upload images). `src/lib/sync.ts` provides an in-memory async queue for background uploads. Triggered automatically after successful generation for logged-in users.

**Infrastructure (`src/lib/`):**
- `rate-limit.ts` — In-memory rate limiting (generate: 10/min, general: 100/min, auth: 5/min)
- `logger.ts` — Structured JSON logging with request tracing
- `timeout.ts` — Request timeout wrappers (image generation: 2 min)
- `errors.ts` — Error class hierarchy with sanitization
- `validation.ts` — Zod v4 schemas for all API inputs

**API routes** in `src/app/api/`:

- `POST /api/generate` — Core endpoint. Flow: rate limit → validate (Zod) → resolve provider (request > settings > api_keys auto-detect) → resolve model (request > settings > DEFAULT_MODELS) → resolve base URL (settings) → create DB record (pending) → call provider with 2-min timeout → on success: update record, return base64, save to disk + enqueue GitHub sync if logged in → on failure: update record, return sanitized error
- `GET/POST /api/keys` — List (masked) / add API keys
- `DELETE/PATCH /api/keys/[id]` — Delete / toggle key
- `GET /api/records` — Generation records (paginated, filterable)
- `GET/POST /api/settings` — App settings key-value store. Allowlisted keys: `default_provider`, `default_quality`, `default_ar`, and per-provider keys (`{provider}_api_key`, `{provider}_base_url`, `{provider}_model`)
- `GET /api/stats` — Dashboard statistics (totals, success/fail, today count, avg duration, per-provider counts)
- `GET/POST /api/images` — User's image gallery (paginated, auth required)
- `GET /api/images/[...path]` — Serve image files from disk
- `GET/POST /api/sync` — GitHub sync status / trigger sync
- `GET /api/auth/session` — Current user session

**Frontend pages** in `src/app/`:
- `/` — XHS (小红书) style card generation (9 visual styles, 6 layouts, 4 palettes)
- `/infographic` — Infographic generation
- `/gallery` — User image gallery (auth required)
- `/records` — Generation history
- `/login` — GitHub OAuth login

All client-rendered with `"use client"`. Uses Ant Design components with inline `style` props (not CSS modules). Tailwind available but primary styling is through Ant Design's `ConfigProvider` theme and inline styles.

**Layout:** `src/app/layout.tsx` uses a top `Header` with navigation links, auth display, and settings/history modals. Wraps children in `SessionProvider`, `AntdRegistry`, and `ConfigProvider`.

## Key Technical Details

- Path alias: `@/*` maps to `./src/*`
- `next.config.ts` uses `output: "standalone"` (required for Docker) and applies security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`) to all routes
- API keys and provider base URLs are managed through the UI settings, not environment variables
- `ProviderError` class in `src/providers/types.ts` carries provider name and HTTP status code
- All providers validate API key presence before making requests
- `VALID_PROVIDERS` array in `/api/generate/route.ts` must stay in sync with the `Provider` type union

## CI/CD

GitHub Actions (`.github/workflows/docker.yml`): builds Docker image, pushes to GHCR on main/tag, auto-deploys to production server via SSH on main push. Production runs on port 6668 with container name `imagegate`.

## Adding a New Provider

1. Create `src/providers/newprovider.ts` — extend `BaseProvider` or implement `ImageProvider` directly
2. Add provider name to the `Provider` type union in `src/providers/types.ts`
3. Register in `src/providers/index.ts` factory (`PROVIDER_REGISTRY` map)
4. Add default model entry in `src/app/api/generate/route.ts` (`DEFAULT_MODELS` and `VALID_PROVIDERS`)
5. Add allowlisted settings keys in `src/app/api/settings/route.ts` if the provider needs API key, base URL, or model settings
