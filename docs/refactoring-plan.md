# ImageGate 前端全面重构方案与团队技术提升计划

> 版本: v1.0 | 日期: 2026-06-30 | 作者: 前端开发专家

---

## 一、现状诊断：核心问题清单

### 1.1 架构层面

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| A1 | 所有页面均为 `"use client"` 纯客户端渲染，未利用 Next.js SSR/SSG 能力 | 🔴 高 | 首屏白屏时间长，SEO 不可用，用户体验差 |
| A2 | 无统一数据层 — 页面内散落 `fetch()` 调用，无缓存/重试/竞态处理 | 🔴 高 | 数据重复请求、缓存失效、竞态 bug 难追踪 |
| A3 | 状态管理碎片化 — HomePage 有 8+ 个 `useState`，无全局 store | 🔴 高 | 组件间通信靠 props drilling，状态难以追踪 |
| A4 | CSS 方案三足鼎立 — Ant Design inline style + CSS Module + Tailwind | 🟡 中 | 样式冲突难排查，新人学习成本高，维护负担重 |
| A5 | API 错误处理不一致 — 部分 `catch { /* silent */ }`，部分 `message.error` | 🟡 中 | 用户体验不统一，问题难以定位 |

### 1.2 类型体系

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| T1 | 类型重复定义 — `GenerateParams` 在 `types/generation.ts` 和 `hooks/useGenerate.ts` 双定义 | 🔴 高 | 改一处漏一处，类型不同步导致运行时 bug |
| T2 | Hook 内部定义局部类型 — `BatchItem`、`RecordItem` 未纳入 `src/types/` | 🟡 中 | 跨组件无法共享类型，类型孤岛 |
| T3 | API 返回类型无契约 — 前端靠手动推断 JSON 结构 | 🟡 中 | API 改动前端无感知，静默崩溃 |

### 1.3 组件层面

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| C1 | HomePage 巨型组件 — 161 行，承载 8 个 state + 3 个 hook + 7 个子组件协调 | 🔴 高 | 难以理解、测试和维护，职责不清 |
| C2 | RecordCard 内嵌页面文件 — 未独立组件化 | 🟡 中 | 不可复用、不可单独测试 |
| C3 | ImageCard 混用 Ant Design + inline style — 243 行巨型组件，22 个 props | 🟡 中 | 过度复杂，与设计系统不统一 |
| C4 | ProviderForm 每次挂载都 fetch `/api/settings` — 无缓存 | 🟡 中 | 重复请求、加载闪烁 |
| C5 | 无 `React.memo` / `useMemo` 保护 — 列表渲染全量重绘 | 🟡 中 | 列表滚动、批量生成时性能差 |

### 1.4 性能层面

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| P1 | Google Fonts 外链加载 — 阻塞渲染 2+ 秒 | 🟡 中 | LCP 指标差，3G 网络体验极差 |
| P2 | base64 图片直传 — 单张 ~2MB 内存占用 | 🔴 高 | 批量生成时内存爆炸，移动端卡死 |
| P3 | 设置数据每次页面加载都重新 fetch — 无持久缓存 | 🟡 中 | 页面切换反复加载，体验闪烁 |
| P4 | 无 Code Splitting — 所有页面共享同一 bundle | 🟡 中 | 首屏加载全量代码 |

### 1.5 代码质量

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| Q1 | 前端零测试 — 48 个测试全在后端 lib，组件无任何测试 | 🔴 高 | 回归无保障，重构心惊胆战 |
| Q2 | ESLint 规则薄弱 — 仅 core-web-vitals + typescript，无自定义规则 | 🟡 中 | 代码风格不统一，潜在问题无预警 |
| Q3 | 无 Storybook — 组件无可视化文档和交互测试 | 🟡 中 | 新人无法直观了解组件用法 |
| Q4 | 空异常捕获 — `catch { /* silent */ }` 模式多处出现 | 🟡 中 | 错误被吞没，排查困难 |

### 1.6 可访问性

| # | 问题 | 严重度 | 影响 |
|---|------|--------|------|
| X1 | ImageCard hover overlay 仅 mouse 交互 — 无键盘替代 | 🔴 高 | 键盘用户/触屏用户无法操作图片 |
| X2 | Modal 焦点管理缺失 — 打开/关闭后焦点不回到触发元素 | 🟡 中 | WCAG 2.1 AA 不合规 |
| X3 | 部分交互元素缺少 `aria-label` | 🟡 中 | 屏幕阅读器体验差 |

---

## 二、重构方案：分层架构重设计

### 2.1 目标架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  Pages    │  │ Layouts  │  │  Modals  │  │  Templates   │    │
│  │ (Server)  │  │ (Mixed)  │  │ (Client) │  │  (Client)    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                        Component Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  ui/*    │  │ home/*   │  │ layout/* │  │  features/*  │    │
│  │ Base     │  │ Domain   │  │ Shell    │  │  Compound    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  SWR /   │  │  API     │  │  Stores  │                      │
│  │  Cache   │  │  Client  │  │  (Zustand)│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│                        Type Contract Layer                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  src/types/ — 统一类型契约（前端 + API schema 共享）       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 数据层重构：SWR + Zustand

#### 核心原则
- **SWR**：负责所有 API 数据获取、缓存、重试、竞态取消
- **Zustand**：负责纯客户端状态（UI 状态、表单状态、modal 状态）
- **不再在组件内直接调用 `fetch()`**

#### SWR 数据层设计

```typescript
// src/lib/api/client.ts — 统一 API 客户端
import type { ApiResponse } from "@/types";

class ApiClient {
  private baseUrl = "";

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: "请求失败" } }));
      throw new ApiError(res.status, error.error?.message || "请求失败");
    }
    return res.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: "请求失败" } }));
      throw new ApiError(res.status, error.error?.message || "请求失败");
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();

// src/lib/api/hooks.ts — SWR hooks
import useSWR from "swr";

export function useSettings() {
  return useSWR<Record<string, string>>("/api/settings", (url) => apiClient.get(url));
}

export function useRecords(page: number, filters?: Record<string, string>) {
  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (filters) Object.entries(filters).forEach(([k, v]) => params.set(k, v));
  return useSWR<RecordsResponse>(`/api/records?${params}`, (url) => apiClient.get(url));
}

export function useImages(page: number) {
  return useSWR<ImagesResponse>(`/api/images?page=${page}&pageSize=20`, (url) => apiClient.get(url));
}

export function useStats() {
  return useSWR<StatsResponse>("/api/stats", (url) => apiClient.get(url));
}
```

#### Zustand 状态管理设计

```typescript
// src/stores/generate-store.ts
import { create } from "zustand";

interface GenerateState {
  provider: string;
  model: string;
  ar: AspectRatio;
  quality: Quality;
  prompt: string;
  batchMode: boolean;
  sidebarOpen: boolean;

  setProvider: (v: string) => void;
  setModel: (v: string) => void;
  setAr: (v: AspectRatio) => void;
  setQuality: (v: Quality) => void;
  setPrompt: (v: string) => void;
  toggleBatchMode: () => void;
  toggleSidebar: () => void;
}

export const useGenerateStore = create<GenerateState>((set) => ({
  provider: "openai",
  model: "",
  ar: "1:1",
  quality: "2k",
  prompt: "",
  batchMode: false,
  sidebarOpen: true,

  setProvider: (v) => set({ provider: v }),
  setModel: (v) => set({ model: v }),
  setAr: (v) => set({ ar: v }),
  setQuality: (v) => set({ quality: v }),
  setPrompt: (v) => set({ prompt: v }),
  toggleBatchMode: () => set((s) => ({ batchMode: !s.batchMode })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

### 2.3 类型契约层重构

#### 核心原则
- **所有类型定义集中在 `src/types/`**
- **Hook 不再自己定义类型，全部从 `src/types/` 引用**
- **API 返回类型与前端类型一一对应，用 Zod schema 做运行时校验**

```typescript
// src/types/api.ts — API 返回契约类型
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: { code: string; message: string };
}

export interface RecordsResponse {
  records: GenerationRecord[];
  total: number;
}

export interface ImagesResponse {
  images: ImageItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface StatsResponse {
  total: number;
  success: number;
  failed: number;
  todayCount: number;
  avgDuration: number;
  providerCounts: Record<string, number>;
}

export interface GenerateResponse {
  image: string; // base64
  provider: string;
  model: string;
  duration_ms: number;
}

// 删除 hooks 中重复的类型定义，统一引用：
// useGenerate.ts → import type { GenerateParams, GenerateResponse } from "@/types"
// useBatchGenerate.ts → import type { BatchItem } from "@/types"
// useRecords.ts → import type { GenerationRecord } from "@/types"
```

### 2.4 组件层重构：分层与职责划分

#### 组件分层规范

| 层级 | 目录 | 职责 | 渲染模式 |
|------|------|------|----------|
| **基础组件** | `src/components/ui/` | 无业务逻辑的纯 UI 原子 — Button, Card, TagBadge, EmptyState | `"use client"` |
| **复合组件** | `src/components/features/` | 组合基础组件 + 业务逻辑 — GenerateForm, ImageGallery, RecordList | `"use client"` |
| **页面壳** | `src/app/*/page.tsx` | 数据获取 + 组合复合组件 + Server Component 优先 | Server / Mixed |
| **布局壳** | `src/app/layout.tsx` | Provider 注入 + 全局 Shell | `"use client"` (Provider 必须) |

#### HomePage 重构拆分

```
当前: HomePage (161行, 8 useState, 3 hooks)
                    │
重构后:
  ┌─────────────────────────────────────────┐
  │  HomePage (Server Component)             │
  │  - 获取 settings 初始数据 (Server)        │
  │  - 组合子组件                             │
  ├─────────────────────────────────────────┤
  │  ┌─ GenerateShell (Client Boundary)     │
  │  │  - Zustand store 初始化               │
  │  │  - SWR 数据订阅                        │
  │  │                                       │
  │  │  ┌─ GenerateForm                     │
  │  │  │  - PromptInput                     │
  │  │  │  - GenerateParams                  │
  │  │  │  - TemplateSelector                │
  │  │  │                                   │
  │  │  ┌─ GenerateResult                   │
  │  │  │  - ImageCard                       │
  │  │  │  - RemixActions                    │
  │  │  │                                   │
  │  │  ┌─ BatchResults                     │
  │  │  │  - BatchItemCard                   │
  │  │  │  - BatchProgress                   │
  │  │  │                                   │
  │  │  ┌─ HistorySidebar                   │
  │  │  │  - RecordCard                      │
  │  │  │  - Pagination                      │
  │  └─────────────────────────────────────┘
  └─────────────────────────────────────────┘
```

### 2.5 CSS 体系统一：CSS Module + Design Tokens

#### 策略
- **逐步淘汰 Ant Design inline style** — 用 CSS Module + CSS 变量替代
- **保留 Ant Design 作为表单/数据展示组件源** — Select, Form, Pagination 等复杂组件仍用 Ant Design
- **自定义 UI 基础组件（Button, Card）用 CSS Module** — 已有基础，继续完善
- **Tailwind 仅用于快速布局辅助** — `flex`, `grid`, `gap` 等原子类，不做样式主体

#### Design Tokens 完善

```css
/* 新增 / 完善的 tokens */
:root {
  /* 组件级 tokens */
  --button-height-sm: 28px;
  --button-height-md: 36px;
  --button-height-lg: 44px;
  --input-height: 36px;
  --card-padding: 16px;
  --modal-width: 700px;

  /* Z-index 层级规范 */
  --z-base: 0;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-modal-backdrop: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;
}
```

### 2.6 Server Component 利用

#### 哪些页面可以转为 Server Component

| 页面 | 当前 | 重构后 | 原因 |
|------|------|--------|------|
| `/` | `"use client"` | **Mixed** — Shell Server, 交互区 Client Boundary | 静态骨架可 SSR，交互部分 Client |
| `/records` | `"use client"` | **Mixed** — 初始数据 Server fetch + 客户端筛选交互 | 初始列表可 SSR，筛选/分页 Client |
| `/gallery` | `"use client"` | **Mixed** — 需 auth check，非 auth 部分 Server | 未登录状态可 SSR 空状态 |
| `/login` | `"use client"` | **Server + Client Form** | 页面骨架 Server，登录按钮 Client |

#### Server Component 示例

```typescript
// src/app/page.tsx — Server Component
import { Suspense } from "react";
import { apiClient } from "@/lib/api/server-client"; // Server-side API client
import GenerateShell from "@/components/features/GenerateShell";

export default async function HomePage() {
  // Server-side 获取初始设置，直接传给 Client Boundary
  const settings = await apiClient.getSettings();

  return (
    <main style={{ minHeight: "calc(100vh - var(--header-height))" }}>
      <Suspense fallback={<GenerateSkeleton />}>
        <GenerateShell initialSettings={settings} />
      </Suspense>
    </main>
  );
}
```

### 2.7 性能优化策略

| 策略 | 当前状态 | 目标 | 实施方式 |
|------|----------|------|----------|
| **LCP** | Google Fonts 阻塞 | < 2.5s | 自托管 Inter 字体，`next/font` 本地加载 |
| **Bundle size** | 全量加载 | 按路由拆分 | `dynamic()` 懒加载 Modal/Heavy组件 |
| **图片传输** | base64 ~2MB/张 | < 200KB | API 返回 URL 而非 base64，图片存 disk + CDN |
| **数据缓存** | 每次重新 fetch | SWR stale-while-revalidate | SWR 全覆盖 |
| **渲染优化** | 全量重绘 | memo + key 优化 | `React.memo` + `useMemo` 保护列表项 |
| **Font** | 外链 Google Fonts | 本地 `next/font` | `next/font/local` 或 `next/font/google` with `display: swap` |

#### 关键优化实施

```typescript
// 1. Font 本地化
// src/app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });

// 2. Modal 懒加载
import dynamic from "next/dynamic";
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });
const HistoryModal = dynamic(() => import("@/components/HistoryModal"), { ssr: false });

// 3. 图片传输改为 URL
// API /api/generate 返回 { imageUrl: "/api/images/abc123.png" } 而非 { image: "base64..." }
// 前端 <img src={result.imageUrl} /> 替代 base64 解码

// 4. React.memo 保护
export const RecordCard = React.memo(function RecordCard({ record }: { record: GenerationRecord }) {
  // ...
});
```

### 2.8 可访问性提升

| 修复项 | 当前 | 目标 | 实施 |
|--------|------|------|------|
| ImageCard overlay | 仅 hover 触发 | hover + focus 触发 | `onFocus` + `onBlur` + `tabIndex={0}` + `aria-label` |
| Modal 焦点管理 | 无 | 打开 trap focus，关闭 restore focus | `FocusTrap` 组件 + `autoFocus` + `returnFocus` |
| 导航 SkipLink | 仅 ThemeProvider 有 | 每个页面都有 | 全局 SkipLink 在 layout 层 |
| 交互元素 aria | 部分缺失 | 全覆盖 | ESLint `jsx-a11y` 规则强制 |

---

## 三、重构实施路线图

### Phase 0：基础设施 (1 周)

| 任务 | 产出 | 验收标准 |
|------|------|----------|
| 安装 SWR + Zustand | `package.json` 更新 | 依赖安装成功 |
| 创建 `src/lib/api/` 目录 | `client.ts`, `hooks.ts`, `server-client.ts` | API 客户端 + SWR hooks 可用 |
| 创建 `src/stores/` 目录 | `generate-store.ts`, `ui-store.ts` | Zustand stores 可用 |
| 完善 `src/types/api.ts` | API 响应契约类型 | TypeScript 编译零错误 |
| 安装 `eslint-plugin-jsx-a11y` | `.eslintrc` 更新 | a11y 规则生效 |

### Phase 1：数据层 + 类型层 (2 周)

| 任务 | 产出 | 验收标准 |
|------|------|----------|
| 删除 hooks 重复类型 | `useGenerate.ts`, `useBatchGenerate.ts` 改引用 `@/types` | 类型零重复 |
| SWR hooks 替代 fetch | `useSettings`, `useRecords`, `useImages`, `useStats` | 所有数据请求走 SWR |
| Zustand 替代 useState 状态 | `useGenerateStore` 替代 HomePage 8 个 useState | HomePage state < 3 个 |
| 统一 API 错误处理 | `ApiError` class + SWR `onError` 全局处理 | catch 不再 silent |

### Phase 2：组件层重构 (3 周)

| 任务 | 产出 | 验收标准 |
|------|------|----------|
| HomePage 拆分 | `GenerateShell`, `GenerateForm`, `GenerateResult` 独立组件 | HomePage < 60 行 |
| RecordCard 外提 | `src/components/features/RecordCard.tsx` | 独立文件，可复用 |
| ImageCard 简化 | 拆分为 `ImageCard` + `ImageOverlayActions` | Props < 12 |
| Modal 懒加载 | `dynamic()` 包裹 SettingsModal, HistoryModal | Bundle 减小 30KB+ |
| CSS Module 统一 | Ant Design inline style → CSS Module 逐步替换 | 新代码零 inline style |

### Phase 3：Server Component + 性能 (2 周)

| 任务 | 产出 | 验收标准 |
|------|------|----------|
| HomePage Server/Mixed | Server Component 骨架 + Client Boundary | 首屏 HTML 可 SSR |
| Records Server/Mixed | 初始数据 Server fetch | 首屏有内容 |
| Gallery Server/Mixed | auth check + 空状态 SSR | 未登录可 SSR |
| Font 本地化 | `next/font/google` 替代外链 | LCP < 2.5s |
| 图片传输改为 URL | API 返回 imageUrl 而非 base64 | 内存占用 < 1/10 |
| React.memo 保护 | 列表组件 memo 化 | 大列表滚动 FPS > 55 |

### Phase 4：测试 + 质量 (2 周)

| 任务 | 产出 | 验收标准 |
|------|------|----------|
| 组件单元测试 | Button, Card, TagBadge, EmptyState 测试 | 核心组件覆盖率 > 80% |
| Hook 测试 | useGenerate, useRecords, useSettings 测试 | Hook 覆盖率 > 80% |
| 页面集成测试 | HomePage, RecordsPage, GalleryPage 渲染测试 | 关键路径覆盖 |
| Storybook 初始化 | 基础组件 Story | 10+ Story 可交互查看 |
| ESLint 规则强化 | a11y + import order + no-console 规则 | CI lint 阻断违规 |
| 可访问性修复 | ImageCard focus, Modal trap, SkipLink | axe-core 零 violation |

---

## 四、团队技术提升计划

### 4.1 结对编程安排

| 周次 | 主题 | 结对方式 | 产出 |
|------|------|----------|------|
| W1 | SWR 数据层 | 专家 + 成员 A/B 轮换 | 2 人掌握 SWR pattern |
| W2 | Zustand 状态管理 | 专家 + 成员 C/D 轮换 | 2 人掌握 Store 设计 |
| W3 | 组件拆分重构 | 成员 A+C 结对 (专家 review) | HomePage 拆分完成 |
| W4 | Server Component | 专家 + 成员 A 结对 | A 掌握 SSR/Mixed 模式 |
| W5 | 测试编写 | 成员 B+D 结对 | 测试覆盖率达标 |
| W6 | 性能优化 | 专家 + 成员 C 结对 | Lighthouse 90+ |

### 4.2 技术分享排期

| # | 主题 | 时间 | 形式 | 目标 |
|---|------|------|------|------|
| 1 | Next.js App Router：Server vs Client Component | Phase 0 结束 | 45min 讲座 + Live Demo | 全员理解渲染模型 |
| 2 | SWR：数据获取的现代范式 | Phase 1 结束 | 30min 讲座 + 实战练习 | 全员掌握 SWR 用法 |
| 3 | Zustand：轻量状态管理 | Phase 1 结束 | 30min 讲座 + 对比 Redux | 全员理解 Store pattern |
| 4 | 组件设计原则：单一职责与组合模式 | Phase 2 结束 | 45min 讲座 + Case Study | 全员掌握组件拆分 |
| 5 | 可访问性实战：从 WCAG 到代码 | Phase 4 结束 | 60min Workshop | 全员能写 a11y 合规代码 |
| 6 | 性能优化全景：从 Lighthouse 到代码 | Phase 3 结束 | 45min 讲座 + Benchmark | 全员理解 Core Web Vitals |

### 4.3 代码审查机制

#### 审查流程
```
PR 提交 → CI 自动检查 (lint + type + test) → 至少 1 人 Code Review → 专家终审 → 合并
```

#### 审查清单 (Checklist)

**架构层面：**
- [ ] 新组件放在正确的层级目录 (ui/ vs features/ vs layout/)
- [ ] 没有在组件内直接 `fetch()` — 必须用 SWR hook 或 API client
- [ ] 没有在 Hook 内定义局部类型 — 必须引用 `@/types`
- [ ] 没有多余的 `"use client"` — 尽量用 Server Component
- [ ] 没有新增 inline style — 使用 CSS Module 或 CSS 变量

**质量层面：**
- [ ] 有对应的单元测试（组件 / Hook）
- [ ] 无 `catch { /* silent */ }` — 必须有错误处理或日志
- [ ] 无 `console.log` 在生产代码中
- [ ] TypeScript strict 模式零错误
- [ ] ESLint 零 error

**可访问性层面：**
- [ ] 交互元素有 `aria-label` 或可见文本
- [ ] 图片有 `alt` 属性
- [ ] Modal 有焦点管理
- [ ] 列表项可键盘操作

---

## 五、代码质量把控标准

### 5.1 编码规范 (ESLint 规则集)

```javascript
// eslint.config.mjs — 扩展规则
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Import 顺序
      "import/order": ["error", {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "never",
        alphabetize: { order: "asc" },
      }],
      // 禁止 console
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // 禁止空 catch
      "no-empty": ["error", { allowEmptyCatch: false }],
      // 禁止 var
      "no-var": "error",
      // 优先 const
      "prefer-const": "error",
      // 禁止未使用变量
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // A11y 规则
  jsxA11y,
]);
```

### 5.2 TypeScript 严格标准

- `strict: true` 已启用 — 保持
- 新增规则：**禁止 `any` 类型** — `@typescript-eslint/no-explicit-any: error`
- 新增规则：**禁止非空断言** — `@typescript-eslint/no-non-null-assertion: warn`
- API 返回类型必须声明 — 不允许 `fetch().then(r => r.json())` 无类型

### 5.3 单元测试覆盖率要求

| 类别 | 覆盖率目标 | 当前 | 差距 |
|------|------------|------|------|
| **基础组件 (`ui/*`)** | ≥ 80% | 0% | 80% |
| **Hook (`hooks/*`)** | ≥ 80% | 0% | 80% |
| **页面组件** | ≥ 60% (关键路径) | 0% | 60% |
| **API Client** | ≥ 90% | 0% | 90% |
| **工具函数 (`lib/*`)** | ≥ 90% | ~60% | 30% |
| **总覆盖率** | ≥ 70% | ~15% | 55% |

#### 测试模板

```typescript
// 组件测试模板
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when loading", () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });
});

// Hook 测试模板 (SWR mock)
import { renderHook, waitFor } from "@testing-library/react";
import { useSettings } from "@/lib/api/hooks";

jest.mock("swr", () => ({
  __esModule: true,
  default: (key, fetcher) => ({
    data: key === "/api/settings" ? { default_provider: "openai" } : undefined,
    error: undefined,
    isLoading: false,
  }),
}));

describe("useSettings", () => {
  it("returns settings data", async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data.default_provider).toBe("openai");
  });
});
```

### 5.4 持续集成检查规则

```yaml
# .github/workflows/ci.yml (新增)
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22" }

      - name: Install
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --max-warnings 0

      - name: Unit tests + coverage
        run: npx jest --coverage --coverageThreshold='{"global":{"branches":70,"functions":70,"lines":70,"statements":70}}'

      - name: Build check
        run: npm run build

      - name: Lighthouse (optional)
        uses: treosh/lighthouse-ci-action@v12
        with:
          urls: http://localhost:6668
          budgetPath: .lighthouse-budget.json
```

#### Lighthouse Budget

```json
// .lighthouse-budget.json
[
  {
    "path": "/*",
    "options": { "firstContentfulPaint": 1500, "largestContentfulPaint": 2500 },
    "budgets": [
      { "resourceSizes": [{ "resourceType": "script", "budget": 200 }, { "resourceType": "stylesheet", "budget": 50 }] },
      { "resourceCounts": [{ "resourceType": "third-party", "budget": 5 }] }
    ]
  }
]
```

---

## 六、风险评估与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| Next.js 16 breaking changes 导致 SSR 方案不兼容 | 中 | 高 | 提前在 dev 环境验证 Server Component 行为，阅读 `node_modules/next/dist/docs/` |
| SWR/Zustand 与现有 Auth Context 竞态 | 低 | 中 | Auth 保持 Context 模式（Provider 必须客户端），SWR 仅覆盖数据请求 |
| Ant Design 与 CSS Module 样式冲突 | 中 | 低 | Ant Design 用 ConfigProvider theme 统一，自定义组件用 CSS Module，不交叉 |
| 重构期间功能回归 | 中 | 高 | 每个 Phase 结束做全量功能测试，PR 必须 CI green |
| 团队成员学习曲线 | 中 | 中 | 结对编程 + 技术分享 + 文档先行 |

---

## 七、成功指标

| 指标 | 当前值 | 目标值 | 测量方式 |
|------|--------|--------|----------|
| Lighthouse Performance | ~60 | ≥ 90 | CI Lighthouse |
| Lighthouse Accessibility | ~75 | ≥ 95 | axe-core + Lighthouse |
| 首屏 LCP | ~3s | < 2.5s | WebPageTest |
| 测试覆盖率 | ~15% | ≥ 70% | Jest coverage |
| TypeScript 错误 | 0 (strict) | 0 | CI tsc |
| ESLint error | ~5 (any) | 0 | CI lint |
| Bundle size (首屏 JS) | ~500KB | < 200KB | webpack-bundle-analyzer |
| HomePage 组件行数 | 161 | < 60 | 代码审查 |
| API 直接 fetch 调用 | ~15 处 | 0 (全走 SWR) | grep 搜索 |
