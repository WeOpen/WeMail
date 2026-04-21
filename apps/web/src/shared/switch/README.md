# 🎚️ shared/switch

共享开关原语层。

## ✅ 放什么
- `Switch`
- 轨道 / 滑块的统一样式、尺寸、交互状态
- 受控的 `checked` 与 `onChange(nextChecked)` 语义
- 键盘、焦点、禁用、`prefers-reduced-motion` 等可访问性处理

## 🚫 不放什么
- 带表单语义的 checkbox（用 `shared/form` 的 `CheckboxField`）
- 多选/多态 segmented control（用 `shared/button` 的 filter pill 组合）
- 业务专属的标签文案与布局（由 feature 层自行包裹）

## 状态约定
- `checked: boolean`：受控；请始终传入当前值
- `onChange(nextChecked: boolean)`：点击或键盘触发时回调下一个状态
- `size`: `sm` / `md` / `lg`，通过 CSS 变量统一缩放轨道与滑块
- `disabled`: 触发 `aria-disabled` + 灰度禁用态
- `label`: 字符串时自动映射为 `aria-label`，可被显式 `aria-label` 覆盖

## 可访问性
- 渲染 `<button role="switch" aria-checked>`，原生支持空格/回车键切换
- 有 `label` 或 `aria-label` 时，屏幕阅读器会读出当前状态
- 焦点态通过 `:focus-visible` 显示统一的辅色外环
