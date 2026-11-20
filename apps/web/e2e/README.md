# 🧪 e2e

前端浏览器 smoke 与设计系统结构测试目录。

## ✅ 放什么
- Playwright 场景测试
- 关键用户旅程 smoke 测试

## 🚫 不放什么
- 单元测试
- 仅依赖组件内部实现细节的测试

## 📍 当前状态

`smoke.spec.ts` 已覆盖首页、登录跳转与返回目标、成员工作台、邮件/账号设置、旧路由跳转、管理员用户与 dashboard 页面、公告查看与发布入口。`design-system.spec.ts` 覆盖公开 `/design-system` 的分组组件结构。

当前配置只启动 Vite preview，业务 API 使用 `page.route()` 模拟。连接真实本地 Worker/D1/R2 的业务 E2E 位于 `../e2e-business`，使用独立 runner 与数据准备：`pnpm test:e2e:business`；外部供应商为受控适配器，真实 staging 外部链路的验证范围见[测试策略](../../../docs/testing-strategy.md)与[验收清单](../../../docs/staging-validation.md)。

在仓库根目录运行：

```bash
pnpm test:e2e:install
pnpm --dir apps/web exec vite build
pnpm test:e2e
```

Playwright 配置启动 `http://127.0.0.1:4173` 的 preview，复用已有服务器；运行前确认该端口是当前构建产物。CI 会先构建 Web，再执行测试并上传报告与 raw test results。

## 📏 约定

- 端到端测试优先验证“用户路径”，不是内部实现细节
- 模拟 API 的页面回归和真实业务验证分别声明边界，不把 mock 响应当作后端或外部服务验收证据
- 新增真实业务 E2E 后同步配置、运行命令、数据隔离与清理说明
- `design-system.spec.ts` 默认只跑结构断言；截图基线需在预览页示例稳定后，通过 `PW_UPDATE_DESIGN_SYSTEM_SNAPSHOTS=1` 显式开启
- `/design-system` 现在是公开页面；相关 e2e 不要求先登录或挂后台壳层
