# ImageGate (妙笔)

> 🎨 AI 图片生成服务，支持 10+ 服务商、多种风格和布局

[![Build](https://github.com/wu529778790/imagegate/actions/workflows/docker.yml/badge.svg)](https://github.com/wu529778790/imagegate/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 功能特性

### 🖼️ 图片生成
- **多服务商支持**：智谱、OpenAI、Google、通义万相、MiniMax、Replicate、即梦、豆包、Azure、OpenRouter
- **小红书风格**：12 种视觉风格 + 8 种布局 + 3 种配色方案
- **风格预览**：点击图片直接选择风格和布局
- **一键生成**：输入文字即可生成精美图片

### 🔐 用户系统
- **GitHub OAuth 登录**：一键登录，无需注册
- **个人图片画廊**：查看和管理生成的图片
- **图片云同步**：自动同步到 GitHub 仓库

### 🛡️ 安全防护
- **API 密钥加密**：AES-256-GCM 加密存储
- **输入验证**：Zod schema 验证所有输入
- **Rate Limiting**：请求限流防止滥用
- **错误脱敏**：不泄露内部实现细节

### 📊 监控与日志
- **结构化日志**：JSON 格式，便于分析
- **请求追踪**：唯一 requestId 追踪
- **性能监控**：生成耗时统计
- **超时控制**：防止请求无限等待

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/wu529778790/imagegate.git
cd imagegate

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 GitHub OAuth 和加密密钥

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
docker run -d \
  -p 6668:3000 \
  -v $(pwd)/data:/app/data \
  --name imagegate \
  ghcr.io/wu529778790/imagegate:main
```

## 📦 技术栈

| 类别 | 技术 |
|------|------|
| **前端** | Next.js 16, React 19, Ant Design 6, Tailwind CSS 4 |
| **后端** | Next.js Route Handlers, TypeScript |
| **数据库** | SQLite (better-sqlite3) |
| **认证** | NextAuth.js (GitHub OAuth) |
| **加密** | Node.js Crypto (AES-256-GCM) |
| **验证** | Zod |
| **测试** | Jest, Testing Library |
| **部署** | Docker, GitHub Actions |

## 🎨 支持的服务商

| 服务商 | 默认模型 | 特性 |
|--------|----------|------|
| 智谱 (Z.AI) | cogview-3 | JWT 认证 |
| OpenAI | gpt-image-2 | 标准 API |
| Google | gemini-2.0-flash-preview-image-generation | Gemini 格式 |
| OpenRouter | google/gemini-2.0-flash-preview-image-generation | 多模型网关 |
| 通义万相 | qwen-image-2.0-pro | 异步任务轮询 |
| MiniMax | image-01 | 统一错误处理 |
| Replicate | google/nano-banana-2 | 异步任务轮询 |
| 即梦 | jimeng_t2i_v40 | 异步任务轮询 |
| 豆包 | doubao-seedream-5-0-260128 | 尺寸规范化 |
| Azure OpenAI | gpt-image-2 | Azure 特定配置 |

## 📁 项目结构

```
imagegate/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── auth/          # 认证相关
│   │   │   ├── generate/      # 图片生成
│   │   │   ├── images/        # 图片管理
│   │   │   ├── keys/          # API 密钥管理
│   │   │   ├── records/       # 生成记录
│   │   │   ├── settings/      # 设置
│   │   │   ├── stats/         # 统计
│   │   │   └── sync/          # 同步
│   │   ├── gallery/           # 图片画廊
│   │   ├── infographic/       # 信息图生成
│   │   ├── login/             # 登录页面
│   │   └── records/           # 记录页面
│   ├── components/            # React 组件
│   ├── lib/                   # 核心库
│   │   ├── auth.ts           # 认证配置
│   │   ├── crypto.ts         # 加密工具
│   │   ├── db.ts             # 数据库
│   │   ├── errors.ts         # 错误处理
│   │   ├── github.ts         # GitHub API
│   │   ├── logger.ts         # 日志系统
│   │   ├── rate-limit.ts     # 限流
│   │   ├── sync.ts           # 同步服务
│   │   ├── timeout.ts        # 超时控制
│   │   └── validation.ts     # 输入验证
│   └── providers/             # 图片生成服务商
│       ├── base.ts           # 基础类
│       ├── zai.ts            # 智谱
│       ├── openai.ts         # OpenAI
│       ├── google.ts         # Google
│       ├── dashscope.ts      # 通义万相
│       ├── minimax.ts        # MiniMax
│       ├── replicate.ts      # Replicate
│       ├── jimeng.ts         # 即梦
│       ├── seedream.ts       # 豆包
│       ├── azure.ts          # Azure
│       └── openrouter.ts     # OpenRouter
├── data/                      # 数据目录
│   ├── images/               # 本地图片存储
│   └── imagegate.db          # SQLite 数据库
└── public/                    # 静态资源
```

## 🔧 环境变量

| 变量 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `DATABASE_URL` | SQLite 文件路径 | 否 | `data/imagegate.db` |
| `NEXTAUTH_URL` | NextAuth URL | 是 | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | 是 | - |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID | 是 | - |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret | 是 | - |
| `ENCRYPTION_SECRET` | 加密密钥 | 否 | 自动生成 |

## 📖 API 文档

### 生成图片

```bash
POST /api/generate
Content-Type: application/json

{
  "prompt": "一只可爱的小猫",
  "provider": "zai",
  "quality": "2k",
  "ar": "16:9"
}
```

### 响应示例

```json
{
  "success": true,
  "image": "base64...",
  "provider": "zai",
  "model": "cogview-3",
  "duration_ms": 1500,
  "savedImage": {
    "localPath": "images/1/2026/06/26/1719412345678_zai_cogview-3.png",
    "imageUrl": "/api/images/1/2026/06/26/1719412345678_zai_cogview-3.png"
  }
}
```

### 错误响应

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "图片生成请求过于频繁，请稍后再试",
    "retryAfter": 45
  }
}
```

## 🧪 测试

```bash
# 运行测试
npm test

# 监视模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

测试覆盖：
- ✅ 加密/解密功能
- ✅ 输入验证
- ✅ 错误处理
- ✅ 48 个单元测试

## 📊 性能指标

| 指标 | 值 |
|------|-----|
| 代码行数 | ~7,200 行 |
| Provider 数量 | 10 个 |
| API 端点 | 15 个 |
| 测试数量 | 48 个 |
| 构建时间 | ~2.5 秒 |

## 🔒 安全特性

1. **API 密钥加密**：使用 AES-256-GCM 加密存储所有敏感信息
2. **输入验证**：Zod schema 验证所有 API 输入
3. **Rate Limiting**：
   - 生图 API：10 请求/分钟
   - 通用 API：100 请求/分钟
   - 认证 API：5 请求/分钟
4. **错误脱敏**：不泄露内部实现细节
5. **请求超时**：防止资源泄漏

## 🚢 部署

### GitHub Actions

项目使用 GitHub Actions 自动部署：

1. 推送到 `main` 分支触发构建
2. 构建 Docker 镜像
3. 推送到 GitHub Container Registry
4. 自动部署到服务器

### 手动部署

```bash
# 构建
npm run build

# 启动
npm run start
```

## 📝 更新日志

### v0.2.0 (2026-06-26)
- ✨ 添加 GitHub OAuth 登录
- ✨ 添加本地图片存储
- ✨ 添加 GitHub 云同步
- 🛡️ 添加 API 密钥加密
- 🛡️ 添加输入验证
- 🛡️ 添加 Rate Limiting
- 📊 添加结构化日志
- 📊 添加请求超时控制
- 🧪 添加单元测试

### v0.1.0 (2026-06-25)
- 🎉 初始版本
- ✨ 支持 10 个图片生成服务商
- ✨ 小红书风格和信息图生成
- ✨ 基础 UI 和 API

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [智谱AI](https://open.bigmodel.cn/) — 智谱 API
- [通义万相](https://dashscope.aliyuncs.com/) — 阿里云图片生成
- [Next.js](https://nextjs.org/) — React 框架
- [Ant Design](https://ant.design/) — UI 组件库
- [Tailwind CSS](https://tailwindcss.com/) — CSS 框架
