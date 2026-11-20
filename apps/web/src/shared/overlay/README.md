# 🪟 shared/overlay

共享弹层原语层。

## ✅ 放什么
- `OverlayDrawer`
- `OverlayDialog`
- 统一遮罩、模糊、标题区、关闭按钮、内容区、底部操作区

## 🚫 不放什么
- 弹层内部业务表单状态
- 业务专属的字段布局
- 路由、数据请求或提交状态机

## 使用约定
- 右侧抽屉用 `OverlayDrawer`
- 居中确认/创建弹窗用 `OverlayDialog`
- 标题通过 `title` 传入，副标题通过 `description` 传入
- 关闭行为由业务传 `onClose`，需要点击遮罩关闭时显式传 `closeOnBackdrop`
- 默认支持 `Esc` 关闭；若场景必须阻止该行为，可传 `closeOnEscape={false}`
- `description` 会自动接入 `aria-describedby`，用于补足弹层语义说明
- 默认通过 shared layer portal 渲染到 `document.body`
- 默认启用 focus trap、背景 inert、body scroll lock 和关闭后的焦点归还
- 背景隔离与滚动锁在 DOM 提交阶段同步恢复；异步提交后关闭弹窗也不会留下已消失弹窗的不可交互背景
