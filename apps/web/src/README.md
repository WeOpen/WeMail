# 🧩 apps/web/src

前端源码根目录。

## 📦 放什么
- `app/`、`pages/`、`features/`、`shared/`、`test/` 五类源码

## 🚫 不放什么
- 构建产物
- 临时脚本
- 与 UI 无关的后端代码

## 🗂️ 目录分层
- `app/`：应用入口、路由、全局装配
- `pages/`：页面级组合
- `features/`：业务特性
- `shared/`：通用 API、hooks、样式、UI、工具
- `test/`：测试工具与集成测试

## 🔄 本地开发建议
- 先从 `app/` 和 `pages/` 理解入口与页面编排
- 新业务逻辑优先落在对应 `features/`
- 共享能力统一收口到 `shared/`
- 页面与交互验证放在 `test/` 或 `e2e/`

## 🔗 相关 README
- `app/README.md`
- `pages/README.md`
- `features/README.md`
- `shared/README.md`
- `test/README.md`
