# 测试与验证策略

## 总体目标

把质量门槛拆成“单元 / 集成 / 浏览器回归 / 发布验证”四层，保证改动既能快速反馈，也能覆盖关键业务流。

## 1. 测试层级

- `packages/shared`：纯函数、共享规则、无副作用工具的单元测试
- `apps/worker/tests`：纯函数、store、runtime、邮件解析与服务边界测试；`tests/integration` 通过 Hono `app.request()` 验证真实路由、权限与用例协同，主要使用内存 store 和模拟外部服务
- `apps/web/src/test`：组件测试；`src/test/integration` 验证路由、页面与业务交互，主要使用模拟 `fetch` 响应
- `apps/web/e2e`：在构建后的 Web preview 中执行 Playwright 页面与交互 smoke；使用 `page.route()` 模拟业务 API
- `apps/web/e2e-business`：独立配置连接真实本地 Worker、D1 与 R2，外部供应商为受控适配器；隔离数据与进程由 `pnpm test:e2e:business` 管理

## 1.1 功能状态与证据

| 状态 | 最低证据 | 不应据此推断 |
| --- | --- | --- |
| 已实现 | 当前源码中的入口、逻辑与相关测试 | 功能已经真实外部联调或上线 |
| 已联调 | 指定 commit、环境、测试命令和通过记录；明确真实组件与替身的范围 | 模拟 Resend / Telegram / Email Routing 已证明真实服务可用 |
| 已上线验收 | 指定部署 commit、真实环境、外部链路和验收记录 | 一次历史演练或配置存在能证明后续发布均可用 |

运行时诊断主要检查绑定、配置和密钥存在性；真实网络、域名路由、投递或恢复能力需要单独验证。完整 lint/typecheck/test/build 与 E2E 的运行结果、耗时、环境和阻塞项应保存为本次批次报告，不从目录名称或历史 `Implemented` 状态推断通过。

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

当前浏览器测试已覆盖：

- landing 与公开设计系统页面结构
- 未登录深链接跳转、登录/注册切换与登录后的返回目标
- 成员工作台、邮件/账号设置直达路由和旧路由重定向
- 管理员用户页、管理员 dashboard、公告查看与管理员发布入口

这些 smoke 证明前端在给定 API 响应下的行为；登录成功响应、邮箱与管理员数据由测试替身提供。`playwright.config.ts` 与快速 smoke job 只启动 Vite preview，该结果不能证明真实注册、D1 持久化或收件/发件链路。

连接真实本地 Worker / 隔离 D1 的业务 E2E 使用 `playwright.business.config.ts`：邀请码注册、建邮箱、调用生产入站处理、列表/详情/提取、API Key 生命周期、权限/额度/幂等、HTML/附件与失败重放。runner 仅绑定 127.0.0.1，测试驱动入口只存在于独立测试 bundle，并使用随机 token；生产 API 不增加入站投递入口。Web 构建与数据位于临时目录，退出后清理。

staging 还需使用真实 Email Routing、Resend 与通知平台验证外部链路，并按 [验收清单](staging-validation.md)记录 commit、域名、消息或事件 ID、结果和时间。外部验收不能被本地供应商适配器或模拟 API 的浏览器 smoke 替代。

## 5. 验证命令

提交前至少执行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm version:check
pnpm api-catalog:check
node scripts/check-migration-numbering.mjs
```

以下情况按需补充：

- 改浏览器交互或关键用户流：`pnpm test:e2e`
- 改真实业务路由、存储或收件/发件链路：`pnpm test:e2e:business`
- 只改 Worker：`pnpm test:worker` / `pnpm test:worker:integration`
- 只改 Web：`pnpm test:web` / `pnpm test:web:integration`
- 只改 shared：`pnpm test:shared`
- 改迁移或恢复流程：验证空库初始化、旧版本升级、旧记录兼容与恢复演练
- 候选发布：`pnpm preflight`，相关浏览器回归和 staging 外部链路验收

浏览器 smoke 使用已构建的 Web 产物。本地首次运行：

```bash
pnpm test:e2e:install
pnpm --dir apps/web exec vite build
pnpm test:e2e
```

## 6. CI / Preview / Release 分工

| Workflow | 触发方式 | 目标 | 说明 |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | `push main` / `pull_request` | 基础质量门禁 | 版本、迁移编号、接口目录检查与 `pnpm test/typecheck/lint/build` |
| `.github/workflows/e2e.yml` | `pull_request` / `workflow_dispatch` | 浏览器级回归 | 独立运行模拟 API smoke 与真实本地业务两个 job，上传报告、trace、截图与 Worker 日志 |
| `.github/workflows/deploy-preview.yml` | `pull_request` | PR 预览构建 | 总是上传前端产物；配置好 Cloudflare 后可额外发 Pages preview |
| `.github/workflows/release.yml` | `workflow_dispatch` / `tag v*` | 发布前总验证 | 检查版本与 tag，执行基础验证；tag 成功时发布 GitHub release，不执行真实外部链路验收或 Cloudflare 生产部署 |
| `.github/workflows/release-drafter.yml` | `push main` | 维护 release draft | 依赖 PR label 自动聚合变更 |

## 7. 文档联动要求

以下变更后，必须同步检查本文件：

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `.github/workflows/deploy-preview.yml`
- `.github/workflows/release.yml`
- `.github/workflows/release-drafter.yml`
- 测试目录、验证命令、E2E 覆盖范围
