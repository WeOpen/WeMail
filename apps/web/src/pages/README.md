# 🗂️ pages

页面层，负责组合 feature / shared 形成完整页面。

## ✅ 放什么
- `AuthPage`
- `InboxPage`
- `DocsPage`：组合任务指南并按需渲染文档站的同一份正文；Markdown 不执行原始 HTML，站内任务链接保持在应用内
- `SystemSettingsPage`、`UsersGlobalSettingsPage` 等路由级页面
- `AdminPage`

## 🚫 不放什么
- 全局应用入口
- 低层 fetch 工具
- 与页面无关的通用组件
