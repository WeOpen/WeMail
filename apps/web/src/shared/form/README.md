# 🧾 shared/form

共享表单原语层。

## ✅ 放什么
- 字段原语：`FormField`、`TextInput`、`SearchInput`、`SelectInput`、`TextareaInput`
- 独立布尔 / 单选原语：`Checkbox`、`Radio`
- 组合字段：`CheckboxField`、`RadioGroupField`
- 轻量 headless 选择器：`MultiSelect`
- 与原生 DOM props 对齐的轻量封装

## 🚫 不放什么
- 页面级表单编排
- 业务校验逻辑
- 表单状态管理和请求提交流程

## 状态约定
- `SearchInput`：`data-state="empty" | "has-value"`，内置搜索图标和清空按钮
- `SelectInput`：系统风格 combobox 触发 + `role="listbox"` 浮层，底层保留隐藏 `select` 同步表单值
- `Checkbox` / `Radio`：复用 `form-check` 系统类，输出 `data-state="checked" | "unchecked"`
- `MultiSelect`：按钮触发 + `role="dialog"` 面板，内部选项复用 `Checkbox`

## 可访问性
- `SearchInput` 依赖 `type="search"` 与显式 `aria-label`
- `SelectInput` 支持 `Enter` / `Space` / `ArrowUp` / `ArrowDown` / `Home` / `End` / `Escape`
- `CheckboxField` / `RadioGroupField` 现有 API 保持不变
- `MultiSelect` 支持 `Enter` / `Space` / `ArrowUp` / `ArrowDown` / `Escape`
