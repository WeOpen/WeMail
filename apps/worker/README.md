# ☁️ apps/worker

后端应用目录（Cloudflare Worker + Hono）。

## 📦 目录职责

这里存放 Worker 源码、Wrangler 配置、后端测试，以及与 Worker 运行时直接绑定的实现。

## ✅ 放什么
- Worker 源码
- `wrangler.toml`
- `.env.example`
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
- `apps/worker/.env.example`：本地开发配置参考模板

如果你需要一份自己的本地参考文件，可以复制：

```bash
cp apps/worker/.env.example apps/worker/.env
```

说明：
- `.env` 只作为本地开发参考模板，不提交仓库
- Worker 本地运行仍以 `wrangler.toml` 和 Wrangler / Cloudflare secrets 为准
- 运行时 secrets 不应直接写入已提交文件

### 3. 启动 Worker 本地开发

当前仓库未提供根级 `dev:worker` 脚本，可直接使用 Wrangler：

```bash
pnpm --dir apps/worker exec wrangler dev
```

本地开发默认读取 `apps/worker/wrangler.toml` 中的本地配置，包括：

- `ENVIRONMENT=local`
- 本地 D1 绑定 `DB`
- 本地默认 vars

### 4. 运行后端验证

在仓库根目录执行：

```bash
pnpm test:worker
pnpm test:worker:integration
pnpm lint
pnpm typecheck
pnpm build
```

### 5. 调整本地配置

本地开发时，优先修改或检查：

- `apps/worker/src/core/config.ts`
- `apps/worker/wrangler.toml`
- 本地 D1 绑定
- 本地 vars
- `apps/worker/.env.example`

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
- D1 database ID 已替换占位值
- 运行时 secrets 已写入对应环境
- 关键后端验证已经执行

详细步骤见 `docs/deploy-runbook.md`。

## 🔗 相关文档

- `apps/worker/src/README.md`
- `apps/worker/src/core/README.md`
- `docs/code-standard.md`
- `docs/testing-strategy.md`
- `docs/deploy-runbook.md`
