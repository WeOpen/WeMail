# 🧮 shared/table

共享表格原语层。

## ✅ 放什么
- `TableContainer` / `Table`
- `TableHead` / `TableBody`
- `TableRow`
- `TableHeaderCell` / `TableCell`
- 统一的单元格对齐 (`align`)、不换行 (`nowrap`)、列宽 (`width`) 约定
- 液态玻璃表格壳层 (`variant="liquid"`) 与密度控制 (`density`)
- 行级交互状态 (`isInteractive`) 和选中状态 (`isSelected`)

## 🚫 不放什么
- 数据驱动的列渲染器（由具体业务特性定义）
- 排序、筛选、分页等有状态行为（属于业务层）
- 业务专属的单元格样式（各 feature 自己的 class）

## 状态约定
- `TableContainer variant`: `liquid` / `solid`
- `TableContainer density`: `compact` / `comfortable` / `spacious`
- `TableRow isSelected`: 输出 `data-selected="true"` 和选中态样式
- `TableRow isInteractive`: 输出 `data-interactive="true"` 和可交互 hover 状态
