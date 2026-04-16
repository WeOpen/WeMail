# WeMail Rounded Logo Soft-Tech Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 WeMail 系统内和品牌资产里的 logo 统一升级为更柔和、更明显圆角的 Soft Tech 版本。

**Architecture:** 先用品牌资产测试锁定新的圆角几何，再同步修改 `WemailLogo` React 组件和 `public/brand` 下的静态 SVG。实现上优先复用现有印章/M 章纹比例，只替换外轮廓与折线语言，避免引入新的品牌分叉。

**Tech Stack:** React 19, TypeScript, static SVG assets, Vitest

---

### Task 1: Lock the rounded geometry with tests

**Files:**
- Modify: `apps/web/src/test/brand-assets.test.ts`

**Step 1: Write the failing test**
- 断言 React logo mark 使用圆角 `rect` 外轮廓，而不是旧的直角 path 盒子。
- 断言 favicon / icon / mono icon 使用新的圆角参数与 round stroke style。

**Step 2: Run test to verify it fails**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 测试文件类型通过，但当前资产不满足新的圆角预期。

**Step 3: Write minimal implementation target**
- 明确新的 rx 与折线圆角约束。

**Step 4: Run test to verify it passes**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 测试文件仍然类型通过，等待资产修改满足断言。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。

### Task 2: Update React and SVG brand assets

**Files:**
- Modify: `apps/web/src/shared/WemailLogo.tsx`
- Modify: `apps/web/public/brand/favicon.svg`
- Modify: `apps/web/public/brand/icon.svg`
- Modify: `apps/web/public/brand/icon-mono.svg`
- Modify: `apps/web/public/brand/app-icon.svg`
- Modify: `apps/web/public/brand/lockup.svg`
- Modify: `apps/web/public/brand/og-image.svg`

**Step 1: Write the failing test**
- 复用 Task 1 的 brand asset tests。

**Step 2: Run test to verify it fails**
Run: `npx tsc --noEmit --project apps/web/tsconfig.json`
Expected: 当前几何尚未切换成圆角版。

**Step 3: Write minimal implementation**
- 外轮廓统一为更高圆角矩形。
- 折痕/侧边统一 round caps / joins。
- 保持印章与 M 章纹识别不变。

**Step 4: Run test to verify it passes**
Run:
- `npx tsc --noEmit --project apps/web/tsconfig.json`
- `git diff --check -- apps/web/src/shared/WemailLogo.tsx apps/web/public/brand/favicon.svg apps/web/public/brand/icon.svg apps/web/public/brand/icon-mono.svg apps/web/public/brand/app-icon.svg apps/web/public/brand/lockup.svg apps/web/public/brand/og-image.svg apps/web/src/test/brand-assets.test.ts`
Expected: 类型通过，diff 无格式错误。

**Step 5: Commit**
- 本轮不提交，由当前会话统一交付。