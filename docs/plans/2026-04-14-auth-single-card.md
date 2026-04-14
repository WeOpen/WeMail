# Auth Single Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将认证页改成单个居中卡片，并通过 tabs 在登录与注册之间切换且保持 URL 同步。

**Architecture:** `AuthPage` 负责根据 pathname 派生当前模式并驱动 tab 切换，`AuthForms` 只保留表单内容，视觉结构统一收敛到单一卡片。测试先锁定 tab 语义、单卡结构和 URL 同步，再做最小实现与样式调整。

**Tech Stack:** React 19, React Router 7, Vitest, Testing Library, Vite CSS

---

### Task 1: 锁定认证页新行为

**Files:**
- Modify: `apps/web/src/test/app.test.tsx`

**Step 1: Write the failing test**

- 增加 `/login` 入口渲染单卡 tab 认证页的测试。
- 增加点击 tab 后切到 `/register` 并展示邀请码字段的测试。

**Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run src/test/app.test.tsx`

**Step 3: Write minimal implementation**

- 在 `AuthPage.tsx` 里改成单卡布局并用 pathname 派生 mode。
- 在 `AuthForms.tsx` 里去掉独立 panel 外壳。

**Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run src/test/app.test.tsx`

**Step 5: Commit**

- 本轮不提交，由当前会话统一交付。

### Task 2: 调整认证页视觉结构

**Files:**
- Modify: `apps/web/src/pages/AuthPage.tsx`
- Modify: `apps/web/src/features/auth/AuthForms.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Write the failing test**

- 复用 Task 1 的失败测试作为视觉结构约束。

**Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run src/test/app.test.tsx`

**Step 3: Write minimal implementation**

- 新增 `auth-card`、`auth-tabs`、`auth-tab` 等样式。
- 让认证卡片在视口中居中，并让表单内容在同一卡片内切换。

**Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run src/test/app.test.tsx`

**Step 5: Commit**

- 本轮不提交，由当前会话统一交付。
