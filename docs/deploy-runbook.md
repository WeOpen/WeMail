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
3. 确认版本与变更记录一致：
   - 运行 `pnpm version:check`
   - 根 `package.json` 的 `version` 是本次计划发布版本
   - workspace `package.json` 版本与根版本一致
   - `CHANGELOG.md` 已把 `[Unreleased]` 内容移动到对应 `## [X.Y.Z] - YYYY-MM-DD`
   - release tag 使用 `vX.Y.Z`，且与根版本一致
4. 确认 `apps/worker/wrangler.toml` 已配置：
   - `env.staging`
   - `env.production`
   - D1 binding 声明和占位 ID
   - KV binding 声明和占位 ID
   - 真实 D1 / KV ID 已配置到 GitHub Environment secrets
   - 系统设置里的默认邮箱域名已指向真实收件域名
5. 确认 Cloudflare 资源可用：
   - D1
   - KV cache namespace
   - Email Routing
   - Pages 项目
   - 可选的 R2 附件桶
   - 可选的 Rate Limiter / AI / Queues 绑定
6. 确认本文档中的 secrets、绑定和发布步骤仍与实现一致。

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
| `CLOUDFLARE_D1_DATABASE_ID` | 必需 | 当前环境的 D1 database ID，用于部署时注入 Worker 绑定 |
| `CLOUDFLARE_KV_NAMESPACE_ID` | 必需 | 当前环境的 KV namespace ID，用于部署时注入 Worker 绑定 |
| `CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID` | 必需 | 当前环境的 KV preview namespace ID，用于部署时注入 Worker 绑定 |
| `GITHUB_TOKEN` | 内建 | 同步 GitHub Deployments 状态 |

`RATE_LIMITER` 的 Cloudflare Workers Rate Limiting `namespace_id` 写在 `apps/worker/wrangler.toml`，必须是账号内唯一的整数形式字符串。它不是 secret，也不需要在 GitHub Environment 里配置；如果同一 Cloudflare 账号中已有 Worker 使用了相同数字，再改成其他整数即可。

还需要在同一个 GitHub Environment 里配置 variable：

| Variable | 是否必需 | 用途 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 必需 | Pages 构建时写入前端 bundle 的 Worker API 根地址，推荐同站 API 自定义域，例如 `https://wemail-api.example.com`，不要带 `/api` |

`VITE_API_BASE_URL` 可以放 GitHub Environment variable，也可以放同名 secret。URL 本身通常不是 secret，优先使用 variable，便于排查。生产环境不要长期使用 `workers.dev` 作为前端 API base；它和自定义 Pages 域名跨站，登录 cookie 可能受浏览器限制。推荐：

- `https://wemail-api.example.com` 这类同站 API 子域名。
- 或者配置 Cloudflare route，让 `https://wemail.example.com/api/*` 指向 Worker。

当 OAuth callback 地址使用前端域名、而 `VITE_API_BASE_URL` 使用同站 API 子域名时，Worker 还需要配置 `COOKIE_DOMAIN=.example.com`，否则 callback 写出的 host-only cookie 不会被 API 子域名请求带上。

`CLOUDFLARE_API_TOKEN` 最小权限建议：

- Account / Workers Scripts: Edit
- Account / D1: Edit（如果 workflow 需要迁移）
- Account / Workers KV Storage: Edit
- Account / Pages: Edit
- Zone / Workers Routes: Edit（`wrangler.toml` 配了 `/api/*` route 时必需）
- Zone / Zone: Read（使用 `zone_name` route 时用于解析 zone ID）
- Account / Workers Tail: Read（可选）

若能分环境拆分 token，优先拆分，避免 production 被 staging 凭证误用。

如果 `deploy-worker` 日志中出现 `Some triggers failed to deploy` 或 `/zones/.../workers/routes`，通常说明 Worker 已上传，但 token 不能更新自定义域名 route。给当前 environment 的 `CLOUDFLARE_API_TOKEN` 补上对应 zone 的 `Workers Routes: Edit` 后重新触发部署。

### 3.3 Worker 运行时 secrets

运行时 secrets 不应作为 GitHub Actions secrets 注入，而应通过 Wrangler 写入 Cloudflare Worker 环境，例如：

- `RESEND_API_KEY`
- `RESEND_FROM`（如需覆盖默认发件地址）
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`（用于校验 Telegram webhook 请求头）
- 其他新增第三方服务密钥

示例：

```bash
cd apps/worker
pnpm exec wrangler secret put RESEND_API_KEY --env staging
pnpm exec wrangler secret put RESEND_API_KEY --env production
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env staging
pnpm exec wrangler secret put TELEGRAM_BOT_TOKEN --env production
pnpm exec wrangler secret put TELEGRAM_WEBHOOK_SECRET --env staging
pnpm exec wrangler secret put TELEGRAM_WEBHOOK_SECRET --env production
```

### 3.4 Wrangler 非 secret 配置与绑定

`apps/worker/wrangler.toml` 只保存启动必需的非敏感配置和绑定声明，例如：

- `CORS_ALLOWED_ORIGINS`（逗号分隔；跨域携带 Cookie 时必须显式列出 Pages / 自定义域名来源，不能依赖 `*`）
- `TELEGRAM_BOT_USERNAME`（用于生成 Telegram deep link）
- `COOKIE_SECURE`
- D1、KV、R2 等 Cloudflare bindings

本仓库按开源场景处理 Cloudflare 资源 ID：`wrangler.toml` 中的 D1 / KV ID 保持 `replace-with-*` 占位值，`.github/workflows/deploy-cloudflare.yml` 会在部署时从当前 GitHub Environment secrets 读取真实 ID 并临时替换。不要把真实 production D1 / KV ID 提交进仓库。

业务默认值不需要写入 `wrangler.toml`：邮箱域名、邮箱数量上限、邮件保留天数、默认发件额度、默认 API 调用额度、附件大小、AI fallback 次数由管理员在 WeMail「系统设置」维护；AI、Telegram、发件和邮箱创建功能开关在「用户设置」的功能开关面板维护。这些值保存在 D1 的 `system_settings` 中，KV 只做可失效缓存。

新增环境时，不要假设 `vars` 和大多数 bindings 会自动继承；需要把必要字段完整写入。

以下绑定按环境声明：

- `[[env.staging.d1_databases]]` / `[[env.production.d1_databases]]`
- `[[env.staging.kv_namespaces]]` / `[[env.production.kv_namespaces]]`
- `[[env.staging.r2_buckets]]` / `[[env.production.r2_buckets]]`（如启用附件存储）
- AI、Rate Limiter、Queues 等其他启用的绑定

## 4. 上线流程总览

一次标准上线分为 8 个阶段：

1. 发布窗口确认
2. 代码冻结与变更盘点
3. 本地与 CI 预检
4. 版本、Changelog 与 release draft 准备
5. staging 部署
6. staging 验证与放行
7. production 部署
8. production 验证、发布公告与观察

推荐角色分工：

| 角色 | 负责人 | 职责 |
| --- | --- | --- |
| Release Driver | 当次上线负责人 | 控制节奏、触发部署、记录结论 |
| Reviewer | 代码 / 产品复核人 | 确认变更范围、风险、回滚路径 |
| Operator | 配置 / Cloudflare 负责人 | 确认 secrets、bindings、迁移、域名 |
| Observer | 发布后观察人 | 看日志、核心指标、用户反馈 |

小团队可以一人兼任多个角色，但 production 前至少要有第二个人确认：版本、迁移、Cloudflare 环境和回滚目标。

## 5. 阶段一：发布窗口确认

上线前先确定这次发布是否可以进入窗口。

检查项：

1. 明确目标环境：
   - `staging`：默认每次上线前必须先发。
   - `production`：只能从 `main` 触发。
2. 明确发布类型：
   - `patch`：缺陷修复、文档、样式、维护。
   - `minor`：向后兼容的新功能。
   - `major`：破坏 API、数据迁移或部署契约。
3. 明确用户影响：
   - 是否影响登录、注册、收件、发件、API key、管理员后台。
   - 是否影响 Cloudflare Email Routing、D1、KV、R2、Resend、Telegram。
4. 明确回滚目标：
   - 上一版稳定 tag，例如 `v0.1.1`。
   - 或上一版稳定 commit SHA。
5. 明确发布窗口：
   - 避免业务高峰。
   - 避免无人观察的深夜发布，除非是紧急修复。
   - 涉及 D1 schema 或权限边界时，预留回滚和数据核查时间。

不能进入发布窗口的情况：

- 没有明确回滚目标。
- 没有 staging 验证计划。
- D1 migration 不可回放或不可解释。
- GitHub Environment 中缺少目标环境的 D1 / KV 绑定 secrets。
- secrets / bindings 只在 staging 或 production 单边配置。
- 生产变更依赖口头步骤但没有写入本文档或 PR 描述。

## 6. 阶段二：代码冻结与变更盘点

进入上线窗口后，冻结目标分支。除 release 修复外，不再合入无关变更。

执行：

```bash
git status --short
git branch --show-current
git log --oneline -10
```

检查：

1. 当前分支是否为预期发布分支。
2. 是否存在未提交文件。
3. 是否存在临时文件、报告文件、`.DS_Store`、本地 `.env`。
4. 是否有未解释的大范围 diff。
5. 是否有删除文件，且删除是本次发布预期行为。

变更盘点至少覆盖：

- 用户可见功能
- API contract
- 数据库 migration
- Worker vars / secrets
- Cloudflare bindings
- Pages 路由或构建配置
- 认证、权限、额度、管理员能力
- 关键测试或 E2E 行为

如果本次改动包含以下内容，release note 必须人工补充说明，不能只依赖自动生成：

- `wrangler.toml`
- `.github/workflows/deploy-cloudflare.yml`
- D1 / R2 / KV / Email Routing / Resend / Telegram 配置方式
- API key、session、管理员权限、配额策略
- 数据迁移、清理任务、Cron 行为

## 7. 阶段三：本地与 CI 预检

### 7.1 本地必跑命令

在发布分支根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm api-catalog:check
git diff --check
```

若改动触达核心页面、路由、导航、登录态、账号、邮件、公告或部署流程，再执行：

```bash
pnpm test:e2e
```

通过标准：

- lint 无错误。
- typecheck 无错误。
- unit / integration 测试全部通过。
- build 退出码为 0。
- E2E 除明确标记 skipped 的视觉 scaffold 外无失败。
- `api-catalog:check` 无生成物漂移。
- `git diff --check` 无尾随空白或冲突标记。

允许但要记录的情况：

- Vite chunk size warning：不阻断上线，但 release note 或后续任务要记录是否需要拆包。
- Wrangler update available：不阻断上线，但不要在上线窗口临时升级 Wrangler。

### 7.2 CI 必须为绿色

合并 production 前确认：

1. PR / branch CI 全部通过。
2. required checks 没有 pending。
3. 没有被跳过的关键校验。
4. workflow 使用的 Node / pnpm / Wrangler 版本与本地预检没有明显漂移。

若本地通过但 CI 失败，以 CI 为准。先修 CI，不绕过保护。

## 8. 阶段四：版本、Changelog 与 release draft

### 8.1 版本同步

按 `docs/development-workflow.md` 的版本方案执行：

```bash
pnpm version:sync
pnpm version:check
```

确认：

- 根 `package.json` 的 `version` 是本次计划发布版本。
- workspace 包版本与根版本一致。
- `packages/shared/src/version.ts` 已同步。
- OpenAPI `info.version` 已同步。
- release tag 使用 `vX.Y.Z`。

### 8.2 Changelog 整理

发布提交前：

1. 将 `CHANGELOG.md` 的 `[Unreleased]` 内容移动到 `## [X.Y.Z] - YYYY-MM-DD`。
2. 保留新的空 `[Unreleased]` 段。
3. 按 Keep a Changelog 分类整理：
   - `Added`
   - `Changed`
   - `Deprecated`
   - `Removed`
   - `Fixed`
   - `Security`
4. 删除重复、内部实现噪音和无法被人理解的 commit log。
5. 特别标注：
   - migration
   - Cloudflare 配置
   - secrets / vars
   - 破坏性变更
   - 需要管理员手动操作的事项

### 8.3 release draft 检查

`release-drafter` 生成草稿后，人工检查：

- 标题是否为 `vX.Y.Z`。
- 内容是否覆盖主要功能、修复、配置变化。
- 是否遗漏 breaking change。
- 是否遗漏 D1 migration 或 Cloudflare vars / bindings 变化。
- 是否注明回滚策略。
- 是否注明上线后需要观察的指标或接口。

## 9. 阶段五：staging 部署

优先通过 GitHub Actions 部署。

执行：

1. 打开 `.github/workflows/deploy-cloudflare.yml`。
2. 点击 `Run workflow`。
3. 选择 `environment = staging`。
4. 确认分支为本次待发布分支。
5. 启动 workflow。

观察 job：

- `prepare`
  - 解析目标环境。
  - 校验 production 分支限制。
  - 输出 D1 database name。
- `verify`
  - 安装依赖。
  - 执行测试、typecheck、lint、build。
- `deploy-worker`
  - 执行 D1 migrations。
  - 部署 Worker。
- `deploy-pages`
  - 构建并部署 Pages preview / staging 分支。

Job Summary 必须记录：

- Environment
- Git ref
- D1 database
- Worker command
- Pages mode
- Worker deployment URL
- Pages deployment URL

staging 失败处理：

1. 不继续 production。
2. 保留失败 job 链接。
3. 判断失败类型：
   - verify 失败：修代码或测试。
   - migration 失败：修 migration，不手动改远端 DB 结构绕过。
   - deploy 失败：检查 Cloudflare token、account、bindings、Pages 项目。
4. 修复后重新从 staging 开始。

## 10. 阶段六：staging 验证与放行

staging 部署完成后，至少执行以下冒烟。

### 10.1 系统健康

检查 Worker health：

```bash
curl -i "$STAGING_API_BASE_URL/api/system/health"
```

期望：

- HTTP 200。
- `ok: true`。
- `environment` 为 `staging`。
- 返回版本与计划发布版本一致。

### 10.2 认证与账号

验证：

1. 未登录访问受保护页面会跳转登录。
2. 邀请码注册可用。
3. 登录后 session 保持正常。
4. 个人设置可以读取。
5. 管理员可以查看用户列表、邀请码、配额。

### 10.3 邮箱主流程

验证：

1. 创建临时邮箱。
2. 列表能看到邮箱。
3. 通过 Cloudflare Email Routing 投递一封测试邮件。
4. 邮件列表能看到新邮件。
5. 邮件详情可打开。
6. 附件邮件可查看附件元数据或下载附件。
7. 验证码 / 链接提取结果展示正常。

### 10.4 发件流程

验证：

1. 选择发件邮箱。
2. 发送测试邮件。
3. 成功记录进入 outbound 列表。
4. 失败记录能显示 provider 错误。
5. 发件配额会递增。
6. 达到配额后继续发送会被拒绝。

### 10.5 集成能力

验证：

1. API key 可以创建、列表、撤销。
2. API key 请求核心接口成功。
3. API key 日配额达到上限后返回 429。
4. Telegram 订阅状态显示正常。
5. Telegram 测试消息可发送。
6. Webhook 测试事件可发送，签名和 delivery log 正常。
7. 公告能展示，管理员能发布 / 编辑 / 归档。

### 10.6 浏览器冒烟

在 staging Pages URL 验证：

- 首页
- 登录 / 注册
- Dashboard
- 账号列表
- 邮件列表
- 发件箱
- API 密钥
- Webhook
- Telegram
- 公告
- 系统设置
- 个人设置

放行 production 前必须满足：

- staging 冒烟全部通过。
- 没有新增 P0 / P1 问题。
- release draft 已人工确认。
- 回滚目标已确认。
- 本次 deployment URL 已记录。

## 11. 阶段七：production 部署

production 部署前进行最后确认：

1. 当前发布 commit 已合入 `main`。
2. `main` CI 为绿色。
3. `CHANGELOG.md` 已包含正式版本段。
4. tag 计划明确，格式为 `vX.Y.Z`。
5. staging 验证完成并记录结论。
6. Cloudflare production secrets / vars / bindings 已确认。
7. 回滚目标 commit 或 tag 已确认。
8. 观察人在线。

执行：

1. 打开 `.github/workflows/deploy-cloudflare.yml`。
2. 点击 `Run workflow`。
3. 选择 `environment = production`。
4. 确认 ref 是 `main`。
5. 若 GitHub Environment 配置了人工审批，审批人确认后放行。
6. 观察 workflow：
   - D1 migrations 先于 Worker deploy 成功。
   - Worker deploy 成功。
   - Pages deploy 成功。
   - GitHub Deployment 状态为 success。

production 失败处理：

- migration 失败：停止发布，保留日志，优先判断是否对生产 D1 产生部分影响。
- Worker deploy 失败：不要继续 Pages 验证，先恢复 Worker 到上一版。
- Pages deploy 失败：如果 Worker 已发但前端未发，判断 API contract 是否兼容；不兼容则回滚 Worker。
- verify 失败：不应进入 production 部署，修复后从 staging 重新开始。

## 12. 阶段八：production 验证、发布公告与观察

### 12.1 production 冒烟

production 完成后立即验证：

1. `GET /api/system/health` 返回 `ok: true`，`environment` 为 `production`。
2. 首页可打开。
3. 登录可用。
4. 创建临时邮箱可用。
5. 收件可用。
6. 邮件详情可读。
7. 发件可用。
8. API key 可访问核心接口。
9. 管理员后台可打开用户、邀请码、额度页面。
10. 公告、Webhook、Telegram 页面无明显加载错误。

### 12.2 日志与指标观察

发布后至少观察 30 分钟。

重点观察：

- Worker error rate。
- 5xx 数量。
- D1 查询错误。
- Email Routing 处理错误。
- Resend / Telegram / Webhook 外部请求失败。
- 登录失败数量。
- API key 429 是否异常增多。
- 前端控制台是否有大量 runtime error。

若 30 分钟内无异常：

1. 更新 release 记录。
2. 发布 GitHub Release。
3. 在团队渠道同步上线完成。
4. 标记本次 release 为稳定版本。

若发现 P0 / P1：

1. 立即进入第 13 节回滚流程。
2. 不继续发布 GitHub Release。
3. 保留 deployment URL、日志、错误样本。

## 13. 回滚与事故处理

### 13.1 回滚原则

默认采用“重新部署上一版稳定提交”方式。

优先级：

1. 先恢复用户主流程。
2. 再处理数据一致性。
3. 最后补文档、测试和复盘。

不要在事故中直接编辑生产数据，除非已经确认：

- 影响范围。
- SQL 或脚本可重复执行。
- 有备份或可恢复路径。
- 至少第二人复核。

### 13.2 代码回滚

1. 找到上一版稳定 tag 或 commit：

```bash
git tag --sort=-creatordate | head
git log --oneline -20
```

2. 使用同一套 deploy workflow 重新部署该版本。
3. 先回滚 Worker，再回滚 Pages，除非问题明确只在 Pages。
4. 回滚完成后执行 production 冒烟。
5. 在事故记录中写明：
   - 回滚到哪个 tag / commit。
   - 回滚开始与完成时间。
   - 用户影响是否恢复。

### 13.3 配置回滚

若问题来自配置，同步回退：

- Wrangler vars。
- Worker secrets。
- Cloudflare bindings。
- Pages 环境变量。
- Email Routing 路由。
- Resend / Telegram / Webhook 外部配置。

配置回滚后必须重新部署或刷新对应服务，使配置实际生效。

### 13.4 数据迁移问题

若问题来自 D1 migration：

1. 停止继续部署。
2. 确认 migration 是否已完全执行。
3. 检查 schema 与应用版本是否匹配。
4. 若 migration 只新增表 / 列 / 索引，优先通过代码回滚恢复兼容。
5. 若 migration 修改或清理数据，先导出受影响数据，再设计修复 migration。
6. 任何生产 D1 修复 SQL 都必须保存到事故记录。

### 13.5 故障分级

| 级别 | 例子 | 目标响应 |
| --- | --- | --- |
| `P0` | 登录不可用、收件主流程不可用、Worker 全部不可用 | 立即回滚或热修，5 分钟内开始处理 |
| `P1` | admin 不可用、outbound 发送异常、API key 大面积失效 | 评估回滚，15 分钟内给出处理方案 |
| `P2` | UI 局部错误、文案 / 样式 / 非核心页面问题 | 记录并排期修复，可不回滚 |

### 13.6 事故记录模板

每次 P0 / P1 必须记录：

```markdown
## Incident: <标题>

- 时间：
- 环境：
- 版本 / commit：
- 影响范围：
- 用户可见表现：
- 检测方式：
- 直接原因：
- 根因：
- 处理动作：
- 回滚目标：
- 恢复时间：
- 遗漏的测试：
- 后续修复：
```

## 14. 常见失败点

- GitHub Environment 没有配置 Cloudflare deploy secrets
- GitHub Environment 没有配置 D1 / KV 绑定 secrets
- `wrangler.toml` 的 D1 / KV 占位符名称和 workflow 注入逻辑不一致
- production 从非 `main` 分支触发
- Worker secrets 只更新了 staging 或 production 其中一个环境
- Pages 项目生产分支设置与仓库 workflow 约定不一致
