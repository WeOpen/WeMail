# 🧰 services

应用服务层。

## ✅ 放什么
- 聚焦单一职责的应用服务函数
- 审计、配置、会话、额度、地址等跨用例复用逻辑
- `app/` 层内部可复用的业务辅助能力

## 📐 推荐组织方式
- 一个文件只解决一个稳定问题域，例如 `audit-service.ts`、`session-service.ts`
- routes / use-cases 直接依赖具体 service，不再通过桶文件统一转发
- service 可以依赖 `core/` 契约与 `shared/` 纯工具，但不要反向依赖 routes

## 🚫 不放什么
- 路由注册
- D1 / R2 直接实现细节
- 与前端表现相关的内容
- 模糊的桶文件，例如按模块名 re-export 一切
- 只为了“看起来整齐”而制造的多层跳转
