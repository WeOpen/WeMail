# 测试与验证策略

## 总体目标

把质量门槛拆成“单元 / 集成 / 浏览器回归 / 发布验证”四层，保证改动既能快速反馈，也能覆盖关键业务流。

## 1. 测试层级

- `packages/shared`：纯函数、共享规则、无副作用工具的单元测试
- `apps/worker`：路由、权限、store、runtime、外部集成边界的集成测试
- `apps/web`：页面与关键交互的组件 / 集成测试
- `Playwright e2e`：关键路径的浏览器级 smoke 回归

## 2. 最低覆盖原则

1. 新增共享纯函数必须有单元测试。
2. 新增后端路由至少覆盖成功路径和权限失败路径。
3. 新增前端关键页面行为至少覆盖可见性和主流程交互。
4. 重构前先锁定旧行为，避免无测试保护的大范围改写。

## 3. 回归要求

以下场景改动后必须补回归：

- 登录 / 注册
- mailbox 创建
- 消息读取
- outbound 发送
- API key 生命周期
- admin invite / quota / feature toggle

## 4. 当前 E2E 范围

当前仓库以 smoke 骨架为主：

- landing / auth 可见性
- settings page
- admin dashboard smoke

以下完整业务流属于下一步扩展目标，需要配合本地或测试环境数据准备：

- invite 注册
- mailbox 创建
- inbox 读取
- outbound 发送

## 5. 验证命令

提交前至少执行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

以下情况按需补充：

- 改浏览器交互或关键用户流：`pnpm test:e2e`
- 只改 Worker：`pnpm test:worker` / `pnpm test:worker:integration`
- 只改 Web：`pnpm test:web` / `pnpm test:web:integration`
- 只改 shared：`pnpm test:shared`

## 6. CI / Preview / Release 分工

| Workflow | 触发方式 | 目标 | 说明 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | `push main` / `pull_request` | 基础质量门禁 | 执行 `pnpm test`、`pnpm typecheck`、`pnpm lint`、`pnpm build` |
| `.github/workflows/e2e.yml` | `pull_request` / `workflow_dispatch` | 浏览器级回归 | 当前以 smoke 骨架为主，失败时上传 Playwright artifacts |
| `.github/workflows/deploy-preview.yml` | `pull_request` | PR 预览构建 | 总是上传前端产物；配置好 Cloudflare 后可额外发 Pages preview |
| `.github/workflows/release.yml` | `workflow_dispatch` / `tag v*` | 发布前总验证 | 面向 release cut，不直接替代生产部署 |
| `.github/workflows/release-drafter.yml` | `push main` | 维护 release draft | 依赖 PR label 自动聚合变更 |

## 7. 文档联动要求

以下变更后，必须同步检查本文件：

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/deploy-preview.yml`
- `.github/workflows/release.yml`
- `.github/workflows/release-drafter.yml`
- 测试目录、验证命令、E2E 覆盖范围
