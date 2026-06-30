# ImageGate 项目记忆

## 项目概况
- Next.js 16 + TypeScript + Ant Design (antd v6) + CSS Modules
- AI 图片生成应用，支持多 provider、批量生成、图库、记录管理
- 数据库：sql.js（WASM SQLite，替代了 better-sqlite3）

## 重要架构决策

### 数据层
- **SWR** 替代散落 fetch 调用，统一缓存/重验证策略
- **apiClient** (`src/lib/api/client.ts`) 统一 HTTP 客户端，ApiClientError 类
- **SWR hooks** (`src/lib/api/hooks.ts`): useSettings, useRecords, useImages, useStats 等

### 状态管理
- **Zustand** 替代多 useState
- `generate-store.ts` — 生成参数 + UI 状态
- `ui-store.ts` — modal 开关状态

### 类型体系
- `src/types/` 集中管理：providers.ts, generation.ts, records.ts, images.ts, settings.ts, api.ts
- 所有组件从 `@/types` 导入，不再有局部重复类型定义

### 数据库
- better-sqlite3 → sql.js（WASM 实现，无需编译原生 addon）
- `src/lib/db.ts` 兼容层保持 better-sqlite3 API（prepare().run/get/all）
- 所有 db 函数 async（返回 Promise）
- `locateFile` 解决 WASM 路径问题
- DELETE journal mode（sql.js 不支持 WAL）

## 关键经验教训

### CSS Module + Server/Client 边界
- **page.tsx 必须保持 `'use client'`**：CSS Module 导入不能跨越 Server/Client 组件边界
- 将页面改为 Server Component 会导致所有 CSS Module 样式丢失
- `layout.tsx` 可以是 Server Component（不含 CSS Module 导入）

### 全局 CSS 导入
- **全局 CSS 必须在 layout.tsx 中显式导入**，否则页面只加载组件 CSS Module，背景色、文字颜色等会全部失效

### antd v6 变更
- `destroyOnClose` → `destroyOnHidden`
- `maskClosable` → `mask={{ closable }}`
- `Segmented` 的 `options` 类型推断较严格，建议直接传入对象数组
- `Checkbox` 没有 `size` prop

### Next.js 16 注意事项
- middleware → proxy（有弃用警告但不阻塞）
- Turbopack 默认构建引擎

## UI 设计方向（2026-06-30 更新）
- 默认浅色主题（light），简洁大气
- 首页采用三栏工作台布局：左侧生成记录、中间生图工作台、右侧生成结果
- 卡片式分组：提示词、参考图、参数设置、生成结果
- 空状态使用虚线边框卡片
- 生图页采用单文件 + 内联子组件模式（借鉴 infinite-canvas）
- 旧 home 组件文件（18个）已删除，所有逻辑内联进 page.tsx
- 生成历史使用 localStorage 存储，非 DB 查询
- 参考图使用横向滚动 + 顺序调整按钮
- 参数选择使用 Pill 按钮（非 Dropdown/Segmented）
- 结果卡片展示宽高/大小/耗时 + 下载/参考操作

## 编译状态（截至 2026-06-30）
- TypeScript: 零错误
- npm run build: 成功
- 预存 ESLint error: 约 43 个（Phase 4 待清理）
