# WeMail Appearance Settings Redesign

**Date:** 2026-04-16

## Goal

把 `/system/appearance` 从占位页升级成苹果式单栏偏好设置界面，同时保留系统设置二级菜单继续留在顶部标题栏。

## Decisions

- 不做左右分栏；页面主体采用单列分组卡片，从上到下组织内容。
- 顶部标题栏继续承载系统设置的二级菜单：`外观设置` / `个人设置`。
- 外观设置页聚焦真实可用的视觉偏好，不做空壳控制项。第一阶段提供：主题模式（浅色 / 深色 / 跟随系统）和实时预览。
- 主题系统从当前的二值切换升级为 `light / dark / system` 偏好模型；右上角按钮保留为快捷切换入口。
- 页面风格参考 Apple Preferences：克制、单列、细分组、即时反馈，但延续 WeMail 自身的浅暖玻璃感。

## Page Structure

### 1. Page intro
- `panel-kicker`: 系统设置
- 页面标题：外观设置
- 一句简洁描述，说明这里控制主题与整体显示偏好

### 2. Theme mode card
- 三个卡片式选项：浅色 / 深色 / 跟随系统
- 每个选项提供小型缩略预览
- 当前选中项有清晰描边和品牌橙强调
- 点击后立即生效，并写入本地存储

### 3. Live preview card
- 单独一张较大的预览卡
- 展示 WeMail 的微缩 topbar / rail / content 结构
- 主题切换时实时更新预览背景、文本和强调色层级
- 页面底部不需要过多解释文案，让视觉本身承担反馈

### 4. System note card
- 显示“当前主题来源”和“当前生效主题”两项状态
- 例如：`偏好：跟随系统`、`当前生效：浅色`
- 用于解释 system 模式和当前结果，避免用户困惑

## Interaction Model

- `light`：强制浅色
- `dark`：强制深色
- `system`：跟随 OS 主题，并监听 `prefers-color-scheme` 变化
- 右上角主题按钮继续保留，作为快捷切换：点击后会切到显式 `light/dark` 模式

## Verification

- 新增系统外观页的集成测试：页面渲染、三态切换、localStorage 持久化、document theme dataset 更新
- 运行 web TypeScript diagnostics
- 保持现有 loading / toast / topbar 结构不被破坏