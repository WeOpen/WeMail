# WeMail Appearance Settings Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将系统设置的外观设置页重做为苹果式单栏偏好设置界面，并让主题系统支持 light / dark / system 三态。

**Architecture:** 保留顶部系统设置二级菜单不变，在 `/system/appearance` 替换掉旧的 `WorkspacePlaceholderPage`，新增专用 appearance 页面组件。主题状态从当前二值模式升级为 “偏好值 + 实际生效值” 模型：`themePreference` 负责持久化，`theme` 继续作为实际应用到 DOM 的 resolved theme。

**Tech Stack:** React 19, TypeScript, React Router, Vitest, CSS

---

### Task 1: Lock the appearance page behavior with tests

**Files:**
- Create: `apps/web/src/test/integration/system-appearance-page.test.tsx`
- Modify: `apps/web/src/test/workspace-shell.test.ts` (only if shell labels need updates)

**Step 1: Write the failing test**
- 断言 `/system/appearance` 不再渲染占位页标题，而是渲染新的“外观设置”页面。
- 断言存在三个主题模式选项：浅色 / 深色 / 跟随系统。
- 断言切换到浅色后 `document.documentElement.dataset.theme === "light"`，且 localStorage 保存对应偏好。

**Step 2: Run test to verify it fails**
Run: `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
Expected: 当前仍是 placeholder，因此新断言失败。

**Step 3: Write minimal implementation target**
- 明确页面标题、分组、控件文案和测试钩子。

**Step 4: Run test to verify it passes**
Run: `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
Expected: 新页面和主题切换行为满足断言。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。

### Task 2: Upgrade the theme model to light / dark / system

**Files:**
- Modify: `apps/web/src/app/useWorkspaceTheme.ts`
- Modify: `apps/web/src/app/App.tsx`
- Modify: `apps/web/src/app/AppLayout.tsx` (if quick toggle wiring changes)

**Step 1: Write the failing test**
- 复用 Task 1 的集成测试，要求支持 `system` 偏好持久化与实时生效。

**Step 2: Run test to verify it fails**
Run: `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
Expected: 当前 hook 只有 light/dark，无法通过。

**Step 3: Write minimal implementation**
- 引入 `WorkspaceThemePreference = light | dark | system`
- `theme` 保持 resolved value；新增 `themePreference` 与 `setThemePreference`
- 监听系统主题变化，仅在 `system` 模式下重新应用主题
- 保持右上角快捷按钮继续可用

**Step 4: Run test to verify it passes**
Run: `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
Expected: 切换和持久化通过。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。

### Task 3: Build the new appearance page UI

**Files:**
- Create: `apps/web/src/pages/SystemAppearancePage.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Write the failing test**
- 继续使用 Task 1 集成测试，要求 appearance 页面存在真实设置卡片与预览卡。

**Step 2: Run test to verify it fails**
Run: `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
Expected: 占位页不满足卡片与交互断言。

**Step 3: Write minimal implementation**
- 创建单列外观设置页：页面 intro、主题模式卡片、实时预览卡、状态说明卡
- 使用现有主题变量做 live preview
- 在 `AppRoutes.tsx` 把 `/system/appearance` 替换为新页面

**Step 4: Run test to verify it passes**
Run:
- `pnpm --dir apps/web exec vitest run src/test/integration/system-appearance-page.test.tsx`
- `pnpm --dir apps/web exec tsc -p tsconfig.json --noEmit`
- `git diff --check -- apps/web/src/app/useWorkspaceTheme.ts apps/web/src/app/App.tsx apps/web/src/app/AppLayout.tsx apps/web/src/app/AppRoutes.tsx apps/web/src/pages/SystemAppearancePage.tsx apps/web/src/shared/styles/index.css apps/web/src/test/integration/system-appearance-page.test.tsx`
Expected: appearance 页面行为与类型均通过，diff clean。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。