# WeMail Toast System Design

**Date:** 2026-04-16

## Goal

把当前页面内横条 `notice-banner` 升级为一套全局可复用的顶部液态胶囊 toast 系统，用于统一承载登录成功、邮箱创建、API Key 更新等系统反馈。

## Decisions

- 采用方案 B：全局 toast host + 队列 + 通用单条 toast 组件。
- 位置固定为顶部居中，悬浮在 topbar 下方，不再占据页面主内容布局。
- 同时最多显示 3 条 toast；新消息从顶部进入，旧消息向下堆叠。
- 默认规则：`success` / `info` 3 秒自动消失，`error` 默认不自动消失并带关闭按钮。
- 移除旧的 `onNotice("...")` 字符串提示流，统一升级为结构化 `onToast({ message, tone, ... })` 输入。

## Component Model

- `shared/toast.ts`: toast 类型定义与默认规则（tone / duration / dismissible）
- `WemailToast.tsx`: 单条液态胶囊 toast
- `WemailToastViewport.tsx`: 顶部固定 host，负责堆叠与裁剪可见项
- `useAppShell.ts`: 管理 `toasts[]`、`pushToast(...)`、`dismissToast(id)`
- `AppLayout.tsx`: 移除旧 `notice-banner`，挂载新的 viewport

## Visual System

- 样式为液态胶囊：大圆角、半透明背景、backdrop blur、细描边、内高光。
- `success`: 品牌橙色柔光 + 深色内容文字。
- `error`: 更高对比度的暖红/琥珀警示，但仍保持品牌玻璃感。
- `info`: 中性液态胶囊。
- 进入动效采用轻微上浮 + 淡入 + scale，整体保持轻盈而不抢主内容。

## Behavior

- 成功类：登录成功、注册成功、发送成功、创建成功等使用自动消失。
- 错误类：需要用户确认的异常保留关闭按钮，不自动消失。
- 若队列超过 3 条，仅显示最上方 3 条，其余等待补位。
- 关闭按钮只在 `dismissible` 为 true 时显示。

## Accessibility

- viewport 使用 `aria-live="polite"`，单条 toast 根据语义使用 `role="status"` / `role="alert"`。
- 关闭按钮带明确 `aria-label`。
- toast 文案保持纯文本可读，不依赖图形传递状态。

## Verification

- 为 toast 组件补单元测试：自动消失、错误关闭、最多显示 3 条。
- 为 `AppLayout` 或 app-level 行为补回归测试：旧 `notice-banner` 消失，toast viewport 出现。
- 跑 web TypeScript diagnostics，并用本地浏览器预览确认液态胶囊样式和层级。
