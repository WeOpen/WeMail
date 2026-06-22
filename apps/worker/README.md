# ☁️ apps/worker

后端应用目录（Cloudflare Worker + Hono）。

## 📦 目录职责

这里存放 Worker 源码、Wrangler 配置、后端测试，以及与 Worker 运行时直接绑定的实现。

## ✅ 放什么
- Worker 源码
- `wrangler.toml`
- 后端测试
- 与 Cloudflare Worker 运行时直接相关的配置

## 🚫 不放什么
- 前端页面代码
- 共享纯逻辑实现（应放 `packages/shared`）
- 与某个前端页面强绑定的表现层代码

## 🧭 本地开发流程

### 1. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

### 2. 检查本地配置

后端配置的职责分成三层：

- `apps/worker/src/core/config.ts`：代码侧的类型化配置解析
- `apps/worker/wrangler.toml`：Worker 本地 vars、D1 绑定、环境配置
- Wrangler / Cloudflare secrets：第三方 token、webhook secret、发件密钥等敏感配置

说明：
- Worker 本地运行以 `wrangler.toml` 的 `[vars]` 和本地 Cloudflare 模拟绑定为准
- 不再维护 `apps/worker/.env`；业务默认值由后台 D1 设置或代码常量兜底
- 运行时 secrets 不应直接写入已提交文件，也不要放进 `wrangler.toml`

### 3. 启动 Worker 本地开发

在仓库根目录执行：

```bash
pnpm dev:worker
```

如果需要同时启动前端和 Worker，可以执行：

```bash
pnpm dev
```

如果只想在后端目录单独启动，也可以：

```bash
pnpm --dir apps/worker run dev
```

本地开发默认读取 `apps/worker/wrangler.toml` 中的本地配置，包括：

- `ENVIRONMENT=local`
- Cookie 和 CORS 基础 vars
- 本地 D1 绑定 `DB`
- 本地 KV 缓存绑定 `CACHE`

域名、额度、附件限制和功能开关属于后台业务配置：优先读取 D1，D1 未配置时使用代码常量兜底，不需要写回 `wrangler.toml`。

KV 只作为可失效的读缓存层使用，D1 仍是系统配置、字典、账号策略和邮件设置的权威数据源。邮箱域名、业务默认额度、附件限制和功能开关应通过后台设置写入 D1，不要作为生产业务配置提交到 `wrangler.toml`。远端环境需要先创建对应 namespace：

```bash
cd apps/worker
pnpm exec wrangler kv namespace create CACHE --env staging
pnpm exec wrangler kv namespace create CACHE --env staging --preview
pnpm exec wrangler kv namespace create CACHE --env production
pnpm exec wrangler kv namespace create CACHE --env production --preview
```

开源仓库不要把真实 namespace id 提交到 `wrangler.toml`。保持配置里的 `replace-with-*` 占位值，并把远端部署需要的真实 ID 配到 GitHub Environment secrets。

### 4. 初始化本地 D1 表结构与邀请码

如果本地启动后端时提示“没有表”或数据库为空，先执行初始化脚本：

在仓库根目录执行：

```bash
pnpm db:init:worker
```

脚本会自动完成两件事：

- 执行 `apps/worker/src/infrastructure/db/schema.sql`
- 在本地 D1 的 `invites` 表里初始化一个邀请码

如果你想指定邀请码，可以执行：

```bash
pnpm db:init:worker -- --invite-code LOCAL-INVITE
```

如果你只想在后端目录单独执行，也可以：

```bash
cd apps/worker
pnpm run db:init:local
pnpm run db:init:local -- --invite-code LOCAL-INVITE
```

执行成功后，终端会输出本次初始化的邀请码。

### 5. 运行后端验证

在仓库根目录执行：

```bash
pnpm test:worker
pnpm test:worker:integration
pnpm lint
pnpm typecheck
pnpm build
```

### 6. 调整本地配置

本地开发时，优先修改或检查：

- `apps/worker/src/core/config.ts`
- `apps/worker/wrangler.toml`
- 本地 D1 绑定
- 本地 vars

如需远端环境 secrets，使用 Wrangler 写入：

```bash
cd apps/worker
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_API_KEY --env production
```

## 🚀 部署流程

### staging / production 部署

统一通过 `.github/workflows/deploy-cloudflare.yml` 执行：

- `staging`：`deploy --env staging`
- `production`：`deploy --env production`

workflow 会从当前 GitHub Environment 读取 `CLOUDFLARE_D1_DATABASE_ID`、`CLOUDFLARE_KV_NAMESPACE_ID` 和 `CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID`，并在部署时临时替换 `wrangler.toml` 中的占位绑定。

生产环境只能从 `main` 触发。

### 本地手动部署

仅在必要时使用：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
cd apps/worker && pnpm exec wrangler deploy --env staging
```

若部署 production，把 `staging` 改成 `production`，并确认当前提交来自 `main`。

## 🔐 部署前确认

- `wrangler.toml` 的环境配置完整
- GitHub Environment 已配置 D1 / KV 绑定 secrets
- 运行时 secrets 已写入对应环境
- 关键后端验证已经执行

详细步骤见 `docs/deploy-runbook.md`。

## 🔗 相关文档

- `apps/worker/src/README.md`
- `apps/worker/src/core/README.md`
- `docs/code-standard.md`
- `docs/testing-strategy.md`
- `docs/deploy-runbook.md`
