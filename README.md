# Image API

内部图片生成 API 服务，带管理界面。封装了 AI 图片生成服务商（Z.AI/智谱、小米）的接口，通过 HTTP 端点提供统一调用，数据存储在 SQLite 中。

## 技术栈

- **前端**: Next.js 16 (App Router), Ant Design 6, Tailwind CSS 4
- **后端**: Next.js Route Handlers
- **数据库**: SQLite (better-sqlite3)
- **部署**: 单容器 Docker

## 快速开始

### 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
docker-compose up -d
```

服务运行在 3000 端口，SQLite 数据持久化在 `./data` 目录。

## 功能

- **仪表盘** (`/`) — 统计概览（总生成次数、成功/失败数、今日生成、平均耗时）
- **图片生成** (`/generate`) — 输入提示词，选择服务商/模型/比例/质量，生成并下载图片
- **密钥管理** (`/keys`) — 管理各服务商 API 密钥，支持启用/禁用
- **生成记录** (`/records`) — 查看历史生成记录，支持分页和筛选
- **设置** (`/settings`) — 配置默认服务商、质量、比例、各服务商 API 地址

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 文件路径 | `data/image-api.db` |

API 密钥和服务商配置通过管理界面设置，无需环境变量。

## 支持的服务商

- **Z.AI (智谱)** — GLM-image 系列模型
- **小米** — 支持 gpt-image 和 dall-e-3 模型
