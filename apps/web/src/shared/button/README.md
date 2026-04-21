# 🔘 shared/button

共享按钮原语层。

## ✅ 放什么
- `Button`
- `ButtonLink`
- `ButtonAnchor`
- 统一按钮尺寸、变体、图标槽位约定
- 统一默认、悬停、点击、禁用、加载中状态
- 链接按钮的 `aria-disabled`、`aria-busy` 和加载反馈语义
- `contentLayout="plain"` 支持卡片式/列表式复杂内容按钮复用同一状态层

## 🚫 不放什么
- tabs / segmented control 之类强语义切换器
- 卡片式选择器
- 业务流程状态机

## 状态约定
- `variant`: `primary`、`secondary`、`ghost`、`text`、`danger`、`icon`、`pill`
- `size`: `xs`、`sm`、`md`、`lg`
- `isLoading`: 自动进入禁用态，展示 spinner 和 `loadingLabel`
- `isDisabled`: 给 `ButtonLink` / `ButtonAnchor` 提供不可点击语义
- `contentLayout="plain"`: 不包裹 `.ui-button-label`，用于主题卡片、邮箱行、消息行等复杂内容

## 层级约定
- 单个明确操作按钮默认用 `primary`
- 两个或多个并排操作按钮时，只保留一个 `primary`，其余用 `secondary`
- 筛选 chip、导航 pill、关闭/取消、危险操作可按语义使用 `ghost`、`pill`、`icon`、`danger`
