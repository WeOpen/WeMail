# Admin Dashboard Mock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把 `/dashboard` 从占位页替换成一个面向平台管理员的大盘展示型 mock 仪表盘。

**Architecture:** 仪表盘使用独立的 `DashboardPage` 与 `dashboardMockData`，通过小组件组合 KPI、趋势图、结构图与资源概览。保留现有 workspace 壳层、路由和主题体系，只为 dashboard hero 增加更紧凑的展示变体，不引入新的图表依赖。

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, SVG, CSS

---

### Task 1: 锁定 dashboard 页面输出

**Files:**
- Create: `apps/web/src/test/integration/dashboard-page.test.tsx`
- Modify: `apps/web/e2e/smoke.spec.ts`

**Step 1: Write the failing test**

- 集成测试断言 `/dashboard` 渲染：
  - KPI 卡片标题（如“今日收件”“平台用户”）
  - 主趋势图标题
  - 邮箱状态分布
  - 重点资源概览
- e2e smoke 补 `/dashboard` 已登录访问断言

**Step 2: Run test to verify it fails**

Run: `pnpm test:web`
Expected: FAIL，因为当前 `/dashboard` 仍是 `WorkspacePlaceholderPage`

**Step 3: Write minimal implementation**

- 暂不实现页面，仅让测试明确目标文案和区域

**Step 4: Run test to verify it passes**

Run: `pnpm test:web`
Expected: 仍失败，等待后续实现

**Step 5: Commit**

- 本轮不单独提交，由当前会话统一交付

### Task 2: 搭建 mock dashboard 页面与数据层

**Files:**
- Create: `apps/web/src/pages/DashboardPage.tsx`
- Create: `apps/web/src/features/dashboard/dashboardMockData.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx`

**Step 1: Write the failing test**

- 复用 Task 1 的失败测试，不新增行为目标

**Step 2: Run test to verify it fails**

Run: `pnpm test:web -- --runInBand`
Expected: FAIL，dashboard 关键标题仍不存在

**Step 3: Write minimal implementation**

- 新建 `dashboardMockData.ts`，提供：
  - KPI
  - 7 天趋势
  - 邮箱状态分布
  - 用户角色结构
  - 增长趋势
  - 资源概览
- 新建 `DashboardPage.tsx`，最少先渲染：
  - KPI 区
  - 趋势区
  - 分布区
  - 资源区
- 在 `AppRoutes.tsx` 用 `DashboardPage` 替换 dashboard 占位页

**Step 4: Run test to verify it passes**

Run: `pnpm test:web`
Expected: PASS，dashboard 集成测试通过

**Step 5: Commit**

- 本轮不单独提交，由当前会话统一交付

### Task 3: 收紧 dashboard hero 并完成大盘布局

**Files:**
- Modify: `apps/web/src/app/workspaceShell.ts`
- Modify: `apps/web/src/app/AppLayout.tsx`
- Modify: `apps/web/src/shared/styles/index.css`
- Modify: `apps/web/src/pages/DashboardPage.tsx`

**Step 1: Write the failing test**

- 用现有 dashboard 集成测试补充更具体断言：
  - hero 仍存在，但文案更偏仪表盘摘要
  - KPI、图表、资源概览形成稳定结构

**Step 2: Run test to verify it fails**

Run: `pnpm test:web`
Expected: FAIL，因为 hero 仍沿用高占位版本

**Step 3: Write minimal implementation**

- 在 shell hero 上增加 dashboard 紧凑变体
- 调整 dashboard hero 标题、描述、stats
- 用 SVG/CSS 实现：
  - 7 天收发趋势图
  - 邮箱状态环形图
  - 增长柱状图
- 完成底部资源概览布局

**Step 4: Run test to verify it passes**

Run: `pnpm test:web`
Expected: PASS

**Step 5: Commit**

- 本轮不单独提交，由当前会话统一交付

### Task 4: 完成全量验证

**Files:**
- Modify if needed: `apps/web/e2e/smoke.spec.ts`

**Step 1: Run targeted verification**

Run: `pnpm test:web`
Expected: PASS

**Step 2: Run e2e verification**

Run: `pnpm test:e2e`
Expected: PASS

**Step 3: Run project verification**

Run: `pnpm lint && pnpm typecheck && pnpm build`
Expected: PASS

**Step 4: Final review**

- 检查没有残留 dashboard 占位文案
- 检查 mock 数据字段命名清晰
- 检查样式保持与现有后台一致

**Step 5: Commit**

- 使用 Lore protocol 统一提交
