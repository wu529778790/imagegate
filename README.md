# 妙笔 (MagicBrush)

AI 图片生成服务，支持 10+ 服务商、多种风格和布局。

> 妙笔生花，一键生成精美图片

## 功能特性

- **多服务商支持**：智谱、OpenAI、Google、通义万相、MiniMax、Replicate 等
- **小红书风格**：9种视觉风格 + 6种布局 + 3种配色方案
- **风格预览**：点击图片直接选择风格和布局
- **一键生成**：输入文字即可生成精美图片

## 技术栈

- **前端**: Next.js 16, Ant Design 6, Tailwind CSS 4
- **后端**: Next.js Route Handlers
- **数据库**: SQLite (better-sqlite3)
- **部署**: Docker

## 快速开始

```bash
# 本地开发
npm install
npm run dev

# Docker 部署
docker-compose up -d
```

访问 http://localhost:3000

## 支持的服务商

| 服务商 | 默认模型 | 说明 |
|--------|----------|------|
| 智谱 (Z.AI) | cogview-3 | 国内版 |
| OpenAI | gpt-image-2 | GPT Image 2 |
| Google | gemini-2.0-flash-preview-image-generation | Gemini |
| OpenRouter | google/gemini-2.0-flash-preview-image-generation | 多模型网关 |
| 通义万相 | qwen-image-2.0-pro | 阿里云 |
| MiniMax | image-01 | MiniMax |
| Replicate | google/nano-banana-2 | Replicate |
| 即梦 | jimeng_t2i_v40 | 字节跳动 |
| 豆包 | doubao-seedream-5-0-260128 | 字节跳动 |
| Azure OpenAI | gpt-image-2 | Azure |

## 小红书风格

### 视觉风格 (12种)

| 风格 | 说明 |
|------|------|
| 甜美可爱 | 少女风、甜美 aesthetic |
| 清新自然 | 干净清爽、自然风格 |
| 温暖舒适 | 温馨友好、亲切感 |
| 大胆醒目 | 高冲击力、吸引眼球 |
| 极简精致 | 超干净、精致简约 |
| 复古怀旧 | 复古风、怀旧潮流 |
| 活力炫彩 | 鲜艳活泼、吸引目光 |
| 极简手绘 | 极简手绘线条、知识感 |
| 黑板粉笔 | 彩色粉笔、教育风格 |
| 学习笔记 | 手写笔记风格 |
| 丝网印刷 | 大胆海报、半色调纹理 |
| 手绘笔记 | 手绘教育信息图、马卡龙色 |

### 信息布局 (8种)

| 布局 | 说明 |
|------|------|
| 简约 | 1-2个要点，最大冲击 |
| 均衡 | 3-4个要点，标准布局 |
| 密集 | 5-8个要点，知识卡片 |
| 列表 | 排名/清单 |
| 对比 | 并排对比 |
| 流程 | 流程/时间线 |
| 思维导图 | 中心辐射 |
| 四象限 | 四象限分区 |

### 配色方案 (3种)

| 配色 | 说明 |
|------|------|
| 马卡龙 | 柔和、教育感 |
| 暖色调 | 大地色系、温馨 |
| 霓虹 | 高能量、未来感 |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | SQLite 文件路径 | `data/magicbrush.db` |

API 密钥通过界面设置，无需环境变量。

## 页面结构

- **首页** (`/`) — 图片生成界面，支持基础生成和小红书风格
- **生成记录** (`/records`) — 查看历史生成记录
- **设置** (`/settings`) — 配置服务商 API 密钥和参数

## Docker 部署

```bash
docker run -d \
  -p 6668:3000 \
  -v $(pwd)/data:/app/data \
  --name magicbrush \
  ghcr.io/wu529778790/magicbrush.shenzjd.com:main
```

## 致谢

- [智谱AI](https://open.bigmodel.cn/) — 智谱 API
- [通义万相](https://dashscope.aliyuncs.com/) — 阿里云图片生成

## License

MIT
