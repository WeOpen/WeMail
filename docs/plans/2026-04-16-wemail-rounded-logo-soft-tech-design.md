# WeMail Rounded Logo Soft-Tech Design

**Date:** 2026-04-16

## Goal

把 WeMail 当前系统内偏直角的信封图标统一升级为更明显、更柔和的 Soft Tech 圆角版本，使运行中的 React logo 与品牌预览页保持一致。

## Decisions

- 采用 Soft Tech 方向：更明显圆角，但不做卡通化处理。
- 外轮廓信封统一改成高圆角矩形；内部折痕与侧边线条统一改为 `round cap + round join`。
- 保留当前印章与线性 `M` 章纹，不削弱品牌识别度，只让整体几何更柔和。
- 同步所有品牌资产：React `WemailLogo`、`icon.svg`、`icon-mono.svg`、`favicon.svg`、`app-icon.svg`、`lockup.svg`、`og-image.svg`。

## Visual Rules

- 外框圆角显著提高：小尺寸 favicon 也应一眼看出圆润感。
- 折痕和侧边不再使用硬直角端点，统一采用圆角连接。
- M 章纹保持现代锐利感，作为柔和信封中的高识别焦点。
- 亮色、深色、静态品牌图、系统 React 组件全部使用同一套几何语言。

## Verification

- 更新 `brand-assets.test.ts`，锁定外框 `rect + rx` 与圆角线条约束。
- 做 web TypeScript diagnostics。
- 用静态 SVG 预览确认 React 与品牌资产的外轮廓语言一致。