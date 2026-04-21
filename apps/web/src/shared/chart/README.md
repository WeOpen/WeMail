# 📊 shared/chart

Nivo 图表共享层。

## ✅ 放什么
- `nivoTheme`：轴、网格、tooltip、crosshair 的统一主题（颜色走 CSS 变量，跟随亮/暗色）
- 未来可扩展：图表通用颜色映射、共享 tooltip 元件、响应式尺寸 hooks

## 🚫 不放什么
- 具体业务的图表组件（由 feature / page 自行组合 Responsive 组件）
- 图表数据（属于各 feature 的 mock 或 API 层）
- 业务专属的配色（用 CSS 变量或数据 tone 字段传入）
