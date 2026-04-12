# 发布与部署手册

## 总体目标

为 staging / production 提供统一的发布准备、部署执行、配置核对、发布后验证、回滚与事故处理流程。

## 1. 环境定义

| 环境 | Worker 命令 | Pages 行为 | 用途 |
| --- | --- | --- | --- |
| `staging` | `wrangler deploy --env staging` | `pages deploy --branch=staging` | 预发布验证、配置联调、回归冒烟 |
| `production` | `wrangler deploy --env production` | `pages deploy`（使用项目生产分支） | 正式发布 |

约束：

- production 只能从 `main` 触发。
- staging 先行，production 后发。
- 没有回滚路径的部署改动不得直接合入主线。

## 2. 部署前准备

1. 先完成基础验证：
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build`
2. 若改动触达关键用户流，再补跑 `pnpm test:e2e`。
3. 确认 `apps/worker/wrangler.toml` 已配置：
   - `env.staging`
   - `env.production`
   - 对应 D1 database ID
   - 对应邮件域名
4. 确认 Cloudflare 资源可用：
   - D1
   - Email Routing
   - Pages 项目
   - 可选的 R2 附件桶
   - 可选的 Rate Limiter / AI / Queues 绑定
5. 确认本文档中的 secrets、绑定和发布步骤仍与实现一致。

## 3. Secrets 与绑定约定

### 3.1 GitHub Environments

仓库至少应配置两个 GitHub Environments：

- `staging`
- `production`

`.github/workflows/deploy-cloudflare.yml` 按环境读取 deploy secrets，production 可额外启用人工审批。

### 3.2 GitHub Secrets：部署所需

建议在 `staging` 与 `production` 环境分别配置：

| Secret | 是否必需 | 用途 |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | 必需 | 调用 Wrangler Action 部署 Worker / Pages |
| `CLOUDFLARE_ACCOUNT_ID` | 必需 | Cloudflare Account ID |
| `CLOUDFLARE_PAGES_PROJECT_NAME` | 必需 | Pages 目标项目名 |
| `GITHUB_TOKEN` | 内建 | 同步 GitHub Deployments 状态 |

`CLOUDFLARE_API_TOKEN` 最小权限建议：

- Account / Workers Scripts: Edit
- Account / D1: Edit（如果 workflow 需要迁移）
- Account / Pages: Edit
- Account / Workers Tail: Read（可选）

若能分环境拆分 token，优先拆分，避免 production 被 staging 凭证误用。

### 3.3 Worker 运行时 secrets

运行时 secrets 不应作为 GitHub Actions secrets 注入，而应通过 Wrangler 写入 Cloudflare Worker 环境，例如：

- `RESEND_API_KEY`
- `RESEND_FROM`（如需覆盖默认发件地址）
- `TELEGRAM_BOT_TOKEN`
- 其他新增第三方服务密钥

示例：

```bash
cd apps/worker
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_API_KEY --env production
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env staging
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env production
```

### 3.4 Wrangler 非 secret 配置与绑定

`apps/worker/wrangler.toml` 保存的是非敏感默认值和绑定声明，例如：

- `DEFAULT_MAIL_DOMAIN`
- `MAILBOX_LIMIT`
- `OUTBOUND_DAILY_LIMIT`
- `ENABLE_AI`
- `ENABLE_TELEGRAM`

新增环境时，不要假设 `vars` 和大多数 bindings 会自动继承；需要把必要字段完整写入。

以下绑定按环境声明：

- `[[env.staging.d1_databases]]` / `[[env.production.d1_databases]]`
- `[[env.staging.r2_buckets]]` / `[[env.production.r2_buckets]]`（如启用附件存储）
- AI、Rate Limiter、Queues 等其他启用的绑定

## 4. 发布流程

1. PR 合并前打正确 label。
2. `release-drafter` 自动更新 GitHub draft release。
3. 准备发版时运行 `.github/workflows/release.yml`。
4. 人工检查 draft release，确认：
   - 是否覆盖主要功能变更
   - 是否遗漏 breaking change
   - 是否遗漏 Cloudflare 配置变化
   - 是否需要提醒管理员执行额外动作
5. 先发 staging，完成冒烟后再发 production。
6. production 成功后，再把草稿发布为正式 release。

以下情况不能只依赖自动生成草稿，必须人工补充说明：

- 改了 `wrangler.toml`
- 改了 `.github/workflows/deploy-cloudflare.yml`
- 改了 D1 / R2 / Email Routing / Resend / Telegram 配置方式
- 改了 API key、鉴权、额度、管理员能力

## 5. 通过 GitHub Actions 部署

1. 打开 `.github/workflows/deploy-cloudflare.yml`。
2. 选择目标环境：`staging` 或 `production`。
3. 观察 workflow 关键阶段：
   - `prepare`：分支保护、secrets 校验、目标解析
   - `verify`：测试、typecheck、lint、build
   - `deploy-worker` 与 `deploy-pages`
4. 查看 Job Summary：
   - Worker deployment URL
   - Pages deployment URL
   - staging / production 模式说明

## 6. 本地手动部署（必要时）

仅在 GitHub Actions 不可用、但又需要紧急操作时使用：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm build
cd apps/worker && pnpm exec wrangler deploy --env staging
```

若部署 production，把 `staging` 改成 `production`，并先确认当前位于 `main` 对应提交。

## 7. 发布后验证

staging 与 production 都至少执行以下冒烟：

1. `GET /health` 返回 `ok: true`，且 `environment` 正确。
2. 邀请码注册可用。
3. 能创建临时邮箱。
4. 能正常收件并查看附件。
5. 能正常发信。
6. AI 能提取验证码或确认链接。
7. Telegram 能收到新邮件通知。
8. 管理员后台能查看用户、邀请码、额度。
9. API key 能访问核心接口。

production 放行前，至少满足：

- CI 为绿色
- staging 已完成部署后冒烟
- release draft 已人工检查
- secrets / bindings 没有环境漂移
- 回滚目标 commit 或 tag 已明确

## 8. 回滚与事故处理

### 8.1 回滚策略

默认采用“重新部署上一版稳定提交”方式：

1. 找到上一版稳定 commit 或 tag。
2. 使用同一套 deploy workflow 重新部署该版本。
3. 若问题来自配置而不是代码，同时回退对应：
   - Wrangler 环境配置
   - Worker secrets
   - Pages 生产分支内容
4. 记录事故、影响范围、根因和后续动作。

### 8.2 故障分级

- `P0`：登录不可用、inbox 主流程不可用、后端全部不可用
- `P1`：admin 不可用、outbound 发送异常、API key 失效
- `P2`：UI 局部错误、文案 / 样式 / 非核心页面问题

### 8.3 处理流程

1. 确认影响范围。
2. 固定证据（日志、配置、最近变更）。
3. 判断是否需要立即回滚。
4. 按本文档执行回滚或修复部署。
5. 事后补充根因、漏测原因、需要新增的测试或文档。

## 9. 常见失败点

- GitHub Environment 没有配置 Cloudflare deploy secrets
- `wrangler.toml` 的 D1 database ID 仍是占位值
- production 从非 `main` 分支触发
- Worker secrets 只更新了 staging 或 production 其中一个环境
- Pages 项目生产分支设置与仓库 workflow 约定不一致
