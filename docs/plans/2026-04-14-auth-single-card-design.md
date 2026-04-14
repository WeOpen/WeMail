# Auth Single Card Design

**Date:** 2026-04-14

## Goal

将 `/login` 和 `/register` 的双卡认证页收敛为单个居中认证卡片，并通过顶部 tabs 在登录与注册之间切换，同时继续保留 URL 同步。

## Decisions

- 保留 `/login` 与 `/register` 路由语义，避免破坏直链、刷新与浏览器历史记录。
- 认证页顶部使用单卡 header + tablist，表单内容放在同一卡片内切换，不再拆成左右两张卡。
- landing 页保持现有结构，只调整认证页。
- 表单逻辑继续留在 `features/auth/AuthForms.tsx`，页面只负责模式派发与路由同步。

## UX Notes

- 默认根据当前 pathname 选中 tab。
- 点击 tab 后立即切到对应 URL。
- 卡片在桌面和移动端都居中显示，避免认证页面左右失衡。
- 登录/注册的文案和表单字段仍按模式变化。

## Verification

- `apps/web/src/test/app.test.tsx` 补认证页 tab 与 URL 同步测试。
- 运行针对性的 Vitest，确认 `/login` 与 `/register` 两个入口都正常。
