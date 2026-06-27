# ImageGate

> 🖼️ AI 图片生成服务 — 支持所有 OpenAI 兼容 API + Anthropic，深色主题，毛玻璃 UI

[![Build](https://github.com/wu529778790/imagegate/actions/workflows/docker.yml/badge.svg)](https://github.com/wu529778790/imagegate/actions)

## ✨ 功能特性

### 🎨 图片生成
- **通用 Provider** — OpenAI 兼容格式覆盖 90% 服务（OpenAI、通义、智谱、豆包、Google 等）
- **Anthropic** — Claude 系列模型
- **Prompt 为中心** — 大输入框 + 快捷参数 chips + ⌘+Enter 快捷键
- **实时预览** — 生成结果内联展示，悬停操作（下载/复制/重新生成）

### 📱 页面
| 页面 | 路由 | 功能 |
|------|------|------|
| 生图 | `/` | 通用 AI 生图，选择 provider/model/比例/质量 |
| 小红书 | `/xhs` | 9 种视觉风格 + 6 种布局 + 4 种配色方案 |
| 图库 | `/gallery` | 已生成图片管理，GitHub 云同步 |
| 信息图 | `/infographic` | 21 种布局 + 22 种风格的信息图生成 |

### 🔐 用户系统
- GitHub OAuth 一键登录
- 个人图片画廊 + 分页浏览
- 自动同步到 GitHub 仓库

### 🛡️ 安全
- AES-256-GCM 加密存储 API 密钥
- Zod 输入验证
- Rate Limiting（生图 10/min，通用 100/min）
- 结构化 JSON 日志 + 请求追踪

## 🚀 快速开始

### 本地开发

```bash
git clone https://github.com/wu529778790/imagegate.git
cd imagegate
npm install

cp .env.example .env
# 编辑 .env 配置 GitHub OAuth

npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
docker run -d \
  -p 6668:3000 \
  -v $(pwd)/data:/app/data \
  --name imagegate \
  -e GITHUB_CLIENT_ID=your-id \
  -e GITHUB_CLIENT_SECRET=your-secret \
  -e NEXTAUTH_URL=https://your-domain.com \
  ghcr.io/wu529778790/imagegate:main
```

### docker-compose

```yaml
services:
  imagegate:
    build: .
    ports:
      - "6668:3000"
    volumes:
      - ./data:/app/data
    env_file: .env
    restart: unless-stopped
```

## 📦 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router), React 19 |
| UI | Ant Design 6 (Dark Theme), Framer Motion |
| 样式 | Tailwind CSS 4, Glassmorphism |
| 字体 | Inter (Google Fonts) |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | NextAuth.js v5 (GitHub OAuth) |
| 验证 | Zod v4 |
| 测试 | Jest, Testing Library (48 tests) |
| 部署 | Docker (multi-stage), GitHub Actions |

## 🔧 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | 是 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | 是 |
| `NEXTAUTH_URL` | 站点 URL（如 `https://imagegate.example.com`） | 是 |
| `ENCRYPTION_SECRET` | 加密密钥 | 否（自动生成） |

> `NEXTAUTH_SECRET` 无需配置，首次启动自动生成并存入 SQLite，重启后自动读取。

## 🎨 Provider 配置

只需配置两个通用 Provider，即可覆盖几乎所有 AI 图片生成服务：

### OpenAI 兼容（推荐）

适用于所有实现 OpenAI `/v1/images/generations` 格式的服务：

| 服务 | Base URL | 默认模型 |
|------|----------|----------|
| OpenAI | `https://api.openai.com/v1` | gpt-image-2 |
| 通义万相 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | qwen-image-2.0-pro |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | cogview-3 |
| 豆包 | `https://ark.cn-beijing.volces.com/api/v3` | doubao-seedream-5-0 |
| Google | `https://generativelanguage.googleapis.com/v1beta/openai` | gemini-2.0-flash |

### Anthropic

| 服务 | Base URL | 默认模型 |
|------|----------|----------|
| Anthropic | `https://api.anthropic.com` | claude-sonnet-4-20250514 |

在设置页面填入 Base URL + Model + API Key 即可使用。

## 📁 项目结构

```
imagegate/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 首页 — AI 生图
│   │   ├── xhs/page.tsx          # 小红书卡片
│   │   ├── gallery/page.tsx      # 图库
│   │   ├── infographic/page.tsx  # 信息图
│   │   ├── login/page.tsx        # 登录
│   │   └── api/                  # API 路由
│   │       ├── generate/         # POST /api/generate
│   │       ├── images/           # 图片管理
│   │       ├── settings/         # 设置读写
│   │       ├── records/          # 生成记录
│   │       ├── sync/             # GitHub 同步
│   │       └── auth/             # NextAuth
│   ├── components/
│   │   ├── SettingsModal.tsx     # Provider 配置
│   │   ├── HistoryModal.tsx      # 历史记录
│   │   └── SessionProvider.tsx   # Session 包装
│   ├── lib/
│   │   ├── auth.ts              # NextAuth + 自动 secret
│   │   ├── db.ts                # SQLite (WAL mode)
│   │   ├── crypto.ts            # AES-256-GCM 加密
│   │   ├── validation.ts        # Zod schemas
│   │   ├── rate-limit.ts        # 内存限流
│   │   ├── logger.ts            # 结构化日志
│   │   ├── timeout.ts           # 超时控制
│   │   ├── errors.ts            # 错误脱敏
│   │   ├── github.ts            # GitHub API
│   │   └── sync.ts              # 同步队列
│   └── providers/
│       ├── types.ts             # Provider 接口
│       ├── base.ts              # 基类
│       ├── openai.ts            # OpenAI 兼容
│       └── anthropic.ts         # Anthropic
├── data/
│   ├── images/                  # 本地图片
│   └── imagegate.db             # SQLite
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml
└── .github/workflows/docker.yml # CI/CD
```

## 🧪 测试

```bash
npm test            # 48 tests
npm run test:watch  # 监视模式
```

## 🚢 部署

推送到 `main` 分支自动触发：

1. Multi-stage Docker 构建（Node 20 slim）
2. 推送到 GitHub Container Registry
3. SSH 部署到服务器（端口 6668）

## 📝 更新日志

### v0.3.0 (2026-06-27)
- 🎨 PRO max UI 重构 — 深色主题 + 毛玻璃 + 渐变网格背景
- 🔀 Provider 简化为 2 个通用类型（OpenAI 兼容 + Anthropic）
- 🗑️ 移除 10 个硬编码 Provider（智谱/Google/OpenRouter/通义/MiniMax/Replicate/即梦/豆包/Azure）
- 📱 Prompt 为中心的生图界面 + 快捷参数 chips
- ✨ Framer Motion 动画（淡入、悬停、侧边栏折叠）
- 🔐 NEXTAUTH_SECRET 自动生成并持久化到 SQLite
- 🐳 Multi-stage Docker 构建（镜像体积大幅缩减）
- 📂 重新组织页面：首页=生图，/xhs=小红书，/gallery=图库

### v0.2.0 (2026-06-26)
- GitHub OAuth 登录
- 本地图片存储 + GitHub 云同步
- API 密钥加密、输入验证、Rate Limiting
- 结构化日志 + 请求超时控制
- 48 个单元测试

### v0.1.0 (2026-06-25)
- 初始版本，支持 10 个图片生成服务商

## 📄 许可证

MIT License
