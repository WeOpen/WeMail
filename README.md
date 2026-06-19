<p align="center">
  <img src="apps/web/public/brand/WeMail.png" alt="WeMail logo" width="128" />
</p>

<h1 align="center">WeMail</h1>

<p align="center">
  Disposable email workspace built on Cloudflare Workers, D1, KV, and React.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.2-111111?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-ff7a00?style=flat-square" />
  <img alt="Node" src="https://img.shields.io/badge/node-22-43853d?style=flat-square" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.18.2-f69220?style=flat-square" />
  <img alt="React" src="https://img.shields.io/badge/react-19-61dafb?style=flat-square" />
  <img alt="Vite" src="https://img.shields.io/badge/vite-7-646cff?style=flat-square" />
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/cloudflare-workers-f38020?style=flat-square" />
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.9-3178c6?style=flat-square" />
</p>

`WeMail` 是一个基于 pnpm monorepo 的 disposable email 服务，提供临时邮箱、邮件收取、发件控制、API Key、公告、Webhook、Telegram 通知与管理员后台能力。

## 仓库结构

```text
apps/web/        # React 19 + Vite 前端
apps/worker/     # Cloudflare Worker + Hono 后端
packages/shared/ # 前后端共享类型、常量、纯函数
```

## 技术栈

| 范围 | 技术 |
| --- | --- |
| 前端 | React 19, Vite, TypeScript |
| 后端 | Cloudflare Workers, Hono |
| 数据 | Cloudflare D1, KV, 可选 R2 |
| 邮件 | Cloudflare Email Routing, Resend outbound |
| 集成 | Telegram Bot, Webhook delivery |
| 包管理 | pnpm workspace |

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 初始化本地 D1

```bash
pnpm db:init:worker
```

指定本地邀请码：

```bash
pnpm db:init:worker -- --invite-code LOCAL-INVITE
```

### 3. 启动开发环境

同时启动 Worker 和 Web：

```bash
pnpm dev
```

分别启动：

```bash
pnpm dev:worker
pnpm dev:web
```

默认地址：

- Web: `http://127.0.0.1:5173`
- Worker: 由 `wrangler dev` 输出为准

## 常用命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm version:check
pnpm version:sync
```

### 按范围运行

```bash
pnpm test:worker
pnpm test:web
pnpm test:shared
pnpm test:worker:integration
pnpm test:web:integration
pnpm test:e2e
```

首次运行 E2E 前安装浏览器：

```bash
pnpm test:e2e:install
```

## 部署步骤

WeMail 的标准部署目标是 Cloudflare：

- Worker: `apps/worker`
- Pages: `apps/web/dist`
- Database: D1
- Cache: KV
- Optional storage: R2

详细发布、回滚和事故处理流程见 `docs/deploy-runbook.md`。根 README 保留可执行的主路径。

### 1. 准备 Cloudflare 资源

在 Cloudflare 中准备：

1. Workers 应用。
2. Pages 项目。
3. D1 数据库：
   - `wemail-staging`
   - `wemail-production`
4. KV namespace：
   - staging `CACHE`
   - production `CACHE`
5. Email Routing 域名与收件路由。
6. 可选 R2 bucket，用于附件或后续文件存储。

创建 KV 示例：

```bash
cd apps/worker
pnpm exec wrangler kv namespace create CACHE --env staging
pnpm exec wrangler kv namespace create CACHE --env production
```

创建 D1 示例：

```bash
cd apps/worker
pnpm exec wrangler d1 create wemail-staging
pnpm exec wrangler d1 create wemail-production
```

把 Cloudflare 返回的 D1 database ID 和 KV namespace ID 写入 `apps/worker/wrangler.toml`：

- `env.staging.d1_databases`
- `env.production.d1_databases`
- `env.staging.kv_namespaces`
- `env.production.kv_namespaces`

不要把 production 保持为 `replace-with-production-*` 占位值。

### 2. 配置 Worker 环境变量

检查 `apps/worker/wrangler.toml` 中的环境配置：

- `DEFAULT_MAIL_DOMAIN`
- `COOKIE_SECURE`
- `CORS_ALLOWED_ORIGINS`
- `MAILBOX_LIMIT`
- `OUTBOUND_DAILY_LIMIT`
- `API_DAILY_LIMIT`
- `AI_FALLBACK_LIMIT`
- `ENABLE_AI`
- `ENABLE_TELEGRAM`
- `ENABLE_OUTBOUND`
- `ENABLE_MAILBOX_CREATION`
- `ADMIN_EMAILS`

生产环境必须满足：

- `COOKIE_SECURE = "true"`
- `CORS_ALLOWED_ORIGINS` 精确列出 Pages 域名或自定义域名
- `DEFAULT_MAIL_DOMAIN` 指向真实邮件域名
- `API_DAILY_LIMIT` 默认可保持 `20000`

### 3. 写入 Worker 运行时 secrets

运行时 secrets 通过 Wrangler 写入 Cloudflare，不提交到仓库：

```bash
cd apps/worker
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_API_KEY --env production
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env staging
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env production
pnpm exec wrangler secret put TELEGRAM_WEBHOOK_SECRET --env staging
pnpm exec wrangler secret put TELEGRAM_WEBHOOK_SECRET --env production
```

按实际启用能力补充其他第三方服务密钥。未启用的能力应同步关闭对应 `ENABLE_*` 配置。

### 4. 配置 GitHub Environments 和 Secrets

创建 GitHub Environments：

- `staging`
- `production`

每个 environment 至少配置：

| Secret | 用途 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Wrangler Action 部署 Worker / Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | Cloudflare Pages 项目名 |

`CLOUDFLARE_API_TOKEN` 建议最小权限：

- Workers Scripts: Edit
- D1: Edit
- Pages: Edit
- Workers Tail: Read，可选

production environment 建议开启人工审批。

### 5. 部署前本地验证

发布前在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm version:check
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm api-catalog:check
```

如果改动影响登录、账号、邮件、公告、API key、Webhook、Telegram 或部署流程，再运行：

```bash
pnpm test:e2e
```

### 6. 部署 staging

推荐使用 GitHub Actions：

1. 打开 `.github/workflows/deploy-cloudflare.yml`。
2. 点击 `Run workflow`。
3. 选择 `environment = staging`。
4. 选择待验证分支。
5. 等待 `verify`、`deploy-worker`、`deploy-pages` 全部通过。

workflow 会执行：

1. `pnpm version:check`
2. `pnpm test`
3. `pnpm typecheck`
4. `pnpm lint`
5. `pnpm build`
6. D1 remote migrations
7. Worker deploy
8. Pages deploy 到 `staging` branch preview

staging 部署后至少验证：

- `GET /api/system/health`
- 首页、登录、注册
- 创建临时邮箱
- 收件与邮件详情
- 发件记录
- API key 创建与调用
- 公告发布与展示
- Webhook 测试事件
- Telegram 绑定或测试消息
- 管理员后台核心页面

### 7. 部署 production

production 只允许从 `main` 部署。

部署前确认：

1. staging 已验证通过。
2. 当前发布 commit 已合入 `main`。
3. CI 为绿色。
4. `CHANGELOG.md` 已更新。
5. `wrangler.toml` production D1 / KV ID 不是占位值。
6. production secrets 已写入。
7. 回滚目标 commit 或 tag 已明确。

执行：

1. 打开 `.github/workflows/deploy-cloudflare.yml`。
2. 点击 `Run workflow`。
3. 选择 `environment = production`。
4. 确认 ref 是 `main`。
5. 如启用 GitHub Environment 审批，审批后放行。
6. 等待 D1 migrations、Worker deploy、Pages deploy 全部完成。

production 完成后立即验证：

```bash
curl -i "$PRODUCTION_API_BASE_URL/api/system/health"
```

并检查：

- 首页可访问
- 登录可用
- 临时邮箱创建可用
- 收件链路可用
- 发件链路可用
- API key 可访问核心接口
- 管理员后台可打开
- Worker 日志没有新增 5xx 或 D1 错误

### 8. 必要时手动部署

只在 GitHub Actions 不可用或明确需要手动操作时使用。

staging：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
cd apps/worker
pnpm exec wrangler d1 migrations apply wemail-staging --env staging --remote
pnpm exec wrangler deploy --env staging
cd ../..
pnpm exec wrangler pages deploy apps/web/dist --project-name=<pages-project-name> --branch=staging
```

production：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
cd apps/worker
pnpm exec wrangler d1 migrations apply wemail-production --env production --remote
pnpm exec wrangler deploy --env production
cd ../..
pnpm exec wrangler pages deploy apps/web/dist --project-name=<pages-project-name>
```

### 9. 回滚入口

优先使用 Cloudflare Dashboard 回滚到上一版 Worker / Pages deployment，或重新部署上一稳定 tag。

回滚后必须验证：

- `GET /api/system/health`
- 登录
- 邮件收取
- 发件
- 管理员后台
- Worker 日志

D1 migration 如果已经写入生产，不能盲目回滚代码后假设数据结构兼容。涉及 schema 的回滚按 `docs/deploy-runbook.md` 执行。

## 文档入口

- `docs/README.md`：项目文档导航
- `docs/code-standard.md`：代码规范与分层边界
- `docs/development-workflow.md`：开发协作流程
- `docs/testing-strategy.md`：测试与验证策略
- `docs/deploy-runbook.md`：发布、部署与回滚手册
- `docs/api-guide.md`：API 使用说明
- `CHANGELOG.md`：项目级版本与变更记录

## 维护规则

- 根 `README.md` 保持项目入口、快速启动和部署主路径。
- 详细发布步骤、回滚和事故模板维护在 `docs/deploy-runbook.md`。
- 改 workflow / deploy / secrets / Cloudflare 绑定时，同步更新 README 与部署手册。
- 每次提交同步更新 `CHANGELOG.md` 的 `[Unreleased]`。
