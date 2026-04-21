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
