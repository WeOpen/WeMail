# 🔍 integration

前端路由、页面与 feature 协同测试目录。

## ✅ 放什么
- 页面级关键交互测试
- 多个 feature 协同测试

## 🚫 不放什么
- 纯 UI snapshot
- 只验证实现细节的测试

## 📍 当前状态

当前已有邮箱与收件箱流程、发件、管理员 dashboard、公告、账号/邮件/系统设置、个人资料与 API Key 等页面测试。通过 Testing Library 渲染生产组件，主要用模拟 `fetch` 响应驱动交互。

这些测试验证前端在给定 API 结果下的行为，不启动真实 Worker/D1 或邮件供应商。在仓库根目录运行 `pnpm test:web:integration`；真实业务与 staging 外部链路验证的边界见[测试策略](../../../../../docs/testing-strategy.md)。
