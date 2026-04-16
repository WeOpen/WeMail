# WeMail Toast System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有 notice 横条替换为通用的顶部液态胶囊 toast 队列系统，并把所有现有 `onNotice(...)` 调用统一接入。

**Architecture:** 在 `useAppShell` 中把单条 `notice` 升级为 `toasts[]` 队列，使用共享 toast 类型工厂生成结构化消息，再通过 `App.tsx` 顶部挂载 `WemailToastViewport` 呈现。组件层拆分为单条 toast 与 viewport 两个共享组件，并把现有 `onNotice("...")` 全量迁移为结构化 `onToast({ message, tone, ... })` 调用。

**Tech Stack:** React 19, TypeScript, Vitest, CSS keyframes/transitions

---

### Task 1: Lock the toast behavior with tests

**Files:**
- Create: `apps/web/src/test/wemail-toast.test.tsx`
- Modify: `apps/web/src/test/app.test.tsx`

**Step 1: Write the failing test**
- 新增 toast 组件测试，覆盖：最多 3 条可见、success 自动消失、error 显示关闭按钮。
- 在 app 测试中补一个回归断言：旧 `notice-banner` 不再作为成功提示的承载层。

**Step 2: Run test to verify it fails**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 新测试目标在当前实现下还不存在。

**Step 3: Write minimal implementation target**
- 明确 toast viewport / toast item 的测试钩子与可访问性约束。

**Step 4: Run test to verify it passes**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 测试文件类型通过，等待组件实现满足行为。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。

### Task 2: Build the shared toast components

**Files:**
- Create: `apps/web/src/shared/toast.ts`
- Create: `apps/web/src/shared/WemailToast.tsx`
- Create: `apps/web/src/shared/WemailToastViewport.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Write the failing test**
- 使用 Task 1 的 toast 单元测试作为主回归。

**Step 2: Run test to verify it fails**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 组件不存在或不满足测试目标。

**Step 3: Write minimal implementation**
- 建立 toast 类型、默认规则与队列裁剪策略。
- 实现单条液态胶囊 toast 与顶部 viewport。
- 为 success / error / info 提供不同视觉 tone 和关闭策略。

**Step 4: Run test to verify it passes**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 新组件类型通过。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。

### Task 3: Replace the notice banner integration

**Files:**
- Modify: `apps/web/src/app/useAppShell.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/AppLayout.tsx`
- Modify: `apps/web/src/features/auth/useAuthSession.ts` (only if typing requires it)
- Modify: `apps/web/src/features/inbox/useInboxWorkspace.ts` (only if typing requires it)
- Modify: `apps/web/src/features/settings/useSettingsData.ts` (only if typing requires it)
- Modify: `apps/web/src/features/admin/useAdminData.ts` (only if typing requires it)

**Step 1: Write the failing test**
- 复用 Task 1 的 app-level 回归测试，要求成功消息进入 toast 队列而不是 banner。

**Step 2: Run test to verify it fails**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 旧 `notice` 字符串模型不满足新的 AppLayout props 与 UI 结构。

**Step 3: Write minimal implementation**
- `useAppShell` 改为维护 `toasts[]` 与 `dismissToast`。
- 保留 `onNotice("...")` 字符串入口，内部转 success toast。
- `AppLayout` 移除横条 banner，挂载顶部 viewport。

**Step 4: Run test to verify it passes**
Run:
- `npx tsc --noEmit --project apps/web/tsconfig.json`
- `git diff --check -- apps/web/src/app/App.tsx apps/web/src/app/AppLayout.tsx apps/web/src/app/useAppShell.ts apps/web/src/shared/toast.ts apps/web/src/shared/WemailToast.tsx apps/web/src/shared/WemailToastViewport.tsx apps/web/src/shared/styles/index.css apps/web/src/test/app.test.tsx apps/web/src/test/wemail-toast.test.tsx`
Expected: 类型通过，diff 无格式错误。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。
