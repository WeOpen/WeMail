# 备份与恢复 Runbook

本 runbook 覆盖 WeMail 自托管部署的数据备份、恢复与恢复后验证。文末保留一次历史本地演练记录；它不代表当前版本、远端 D1、R2 或生产切库已完成演练。每次涉及 schema 的发布都需要补充当次恢复证据。

适用对象：独立部署 WeMail 的运维者。下文以 production 为例；staging 使用独立资源、GitHub Environment 和 `--env staging`。操作前确认账号、数据库 ID、桶名、备份时间和待恢复 commit。

## 1. 数据面盘点

| 数据 | 位置 | 保留策略 | 备份必要性 |
| --- | --- | --- | --- |
| 用户、邮箱、消息元数据、设置、投递记录、审计 | D1（`DB` 绑定） | 消息按保留期由 cron 清理 | **高**：唯一事实源 |
| 附件二进制 | R2（`ATTACHMENTS` 绑定） | 随消息删除清理 | 按附件恢复要求决定；D1 元数据无法重建原附件 |
| Worker 公共配置 | `apps/worker/wrangler.toml` | 随仓库 | 已由 Git 管理，远端 D1/KV ID 保留占位值 |
| 绑定 ID、部署凭证、运行时密钥 | GitHub Environment secrets、Worker secrets | 仓库外维护 | 单独保存配置清单与安全恢复路径，Git 不包含这些值 |

D1 导出**不包含** R2 附件。只恢复 D1 时，仍需检查恢复记录对应的 R2 对象是否存在；源桶对象已清理时，必须从附件备份还原。

## 2. 备份

### 2.1 记录备份上下文

记录环境、Cloudflare 账号、源数据库 ID、备份时间、应用 commit、各业务表行数、索引与 `d1_migrations` 记录。备份文件包含用户和邮件数据，保存到仓库外的受控备份目录。恢复窗口内暂停业务写入、Email Routing 投递和清理任务，避免备份后的新数据在切库时丢失；同时安排入站恢复或重投。

### 2.2 准备私有 Wrangler 配置

GitHub Actions 在运行时用当前 Environment 的 `CLOUDFLARE_D1_DATABASE_ID`、`CLOUDFLARE_KV_NAMESPACE_ID`、`CLOUDFLARE_KV_PREVIEW_NAMESPACE_ID` 替换占位值。本地 Wrangler 不会读取 GitHub secrets，不能直接用公开配置操作远端 `DB`。

在 `apps/worker` 下创建已被 `.gitignore` 忽略的私有副本：

```bash
cd apps/worker
mkdir -p .wrangler
cp wrangler.toml .wrangler/wrangler.recovery.toml
```

编辑该副本：将 `main` 改为 `../src/index.ts`，各 `migrations_dir` 改为 `../src/infrastructure/db/migrations`；填入目标环境的真实 D1/KV ID，保留需要的路由、变量与 R2 bucket。配置移入 `.wrangler/` 后，路径相对该目录解析。生产资源 ID 和密钥不写回公开配置，也不打印到日志。运行时密钥仍由 Cloudflare Worker secrets 管理。

下文私有配置中的 production `DB` 初始指向源库；在切换前保留源库配置副本，以便回退。

### 2.3 D1 导出（每日 / 每次发布前）

```bash
pnpm exec wrangler d1 export DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml --output /secure/wemail-backup/backup-YYYYMMDD.sql
```

确认文件存在且非空，核对 schema、数据、索引及迁移台账，与备份上下文一起保存。导出后应在隔离的新库验证导入，不能仅以文件生成成功认定恢复可用。[D1 导入导出说明](https://developers.cloudflare.com/d1/best-practices/import-export-data/)

### 2.4 R2 附件清单与备份

当前仓库的 Wrangler 4.105.0 提供 `r2 object get/put/delete`，没有 `r2 object list` 或 `r2 token create`。通过 Cloudflare Dashboard 创建限制到目标 bucket 的 R2 S3 凭据，再按 [R2 凭据说明](https://developers.cloudflare.com/r2/api/tokens/)和 [AWS CLI 示例](https://developers.cloudflare.com/r2/examples/aws/aws-cli/)配置独立 profile（region 使用 `auto`）。凭据不要作为命令行参数或提交到仓库。

```bash
aws configure --profile wemail-r2-backup
aws s3api list-objects-v2 --profile wemail-r2-backup \
  --bucket wemail-production-attachments --prefix attachments/ \
  --endpoint-url "https://<account-id>.r2.cloudflarestorage.com" \
  > /secure/wemail-backup/attachment-manifest.json
aws s3 sync s3://wemail-production-attachments/attachments/ \
  /secure/wemail-backup/attachments/ --profile wemail-r2-backup \
  --endpoint-url "https://<account-id>.r2.cloudflarestorage.com"
```

核对清单是否完整（分页由 AWS CLI 处理），保存对象数量、key、大小与备份时间。上述命令是 S3 兼容操作示例，当前未对真实桶演练；每次恢复应验证样本附件下载和完整性。省略二进制备份意味着恢复目标不包含已丢失的附件。

## 3. 恢复

### 3.1 导入全新数据库

恢复到全新数据库，避免对已有业务数据执行含建表和插入语句的 SQL。建表冲突不构成可靠的防覆盖机制，导入前必须确认目标 ID。

```bash
pnpm exec wrangler d1 create wemail-production-restore
```

把新库的 ID 和名称填入私有配置的 `[[env.production.d1_databases]]`；`DB` 此时指向恢复库。不要把新库 ID 写入公开 `wrangler.toml`。然后执行：

```bash
pnpm exec wrangler d1 execute DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml --file /secure/wemail-backup/backup-YYYYMMDD.sql
pnpm exec wrangler d1 execute DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml \
  --command "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM accounts) AS mailboxes, (SELECT COUNT(*) FROM mail_messages) AS messages"
pnpm exec wrangler d1 execute DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml \
  --command "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mail_messages_account_message_id'"
pnpm exec wrangler d1 execute DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml --command "SELECT name FROM d1_migrations ORDER BY id"
pnpm exec wrangler d1 migrations list DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml
```

把结果与备份上下文比较，并确认待部署代码所需迁移。导出 schema 不意味着迁移自动为空操作：若 `d1_migrations` 缺失或与 schema 不一致，先恢复备份中的真实迁移台账并验证，不能重新盲跑所有建表/加列迁移。若备份早于当前代码，只应用已审查的增量迁移；schema 与记录无法核对时先恢复到与备份匹配的应用版本。[D1 迁移命令](https://developers.cloudflare.com/d1/wrangler-commands/#d1-migrations-list)

### 3.2 切换应用绑定

| 部署方式 | 切库步骤 | 回退到旧库 |
| --- | --- | --- |
| GitHub Actions（推荐） | 更新 **production GitHub Environment** 的 `CLOUDFLARE_D1_DATABASE_ID` 为恢复库 ID；保留原值的安全记录，再运行 `Deploy Cloudflare → production` | 把同一个 Environment secret 恢复为旧库 ID，并重新部署兼容的应用 commit |
| 手动部署 | 在私有配置中确认恢复库的 `database_id`、`database_name`，使用下面的部署命令 | 用保留的源库私有配置恢复 ID/名称，再部署兼容的代码 |

Actions 的公开配置名称仍可能显示 `wemail-production`，真正的绑定目标由注入的 `database_id` 决定。工作流先通过 `DB` 应用迁移，再部署 Worker；完成 3.1 的迁移核对后才能触发。只改本地 TOML 不会改变下一次 Actions 的目标。R2 未切桶时无需修改其绑定，但必须核对对象与恢复数据是否匹配。

手动部署在 `apps/worker` 下执行：

```bash
pnpm exec wrangler d1 migrations apply DB --env production --remote \
  --config .wrangler/wrangler.recovery.toml
pnpm exec wrangler deploy --env production --config .wrangler/wrangler.recovery.toml
```

旧库未由上述导入步骤修改；应用开始向恢复库写入后，两库会产生差异。回退前核对切库后新增数据与外部投递状态，不能把换回绑定等同于数据无损回滚。

### 3.3 恢复后验证

健康检查 `GET /api/system/health` 返回正常；登录已知账号；创建测试邮箱；投递邮件并确认列表、详情、提取结果与附件下载；重复投递同一 Message-ID 只生成一条消息。验证通知和发件记录，核对管理员与成员访问边界，再恢复清理任务和正常流量。记录环境、commit、源/目标库、时间、命令退出状态、行数/索引对比与业务验收结果。

## 4. 历史本地演练记录（2026-09-05）

以下记录来自当时的手册，演练产物已清理，本次没有重新执行这些数据操作：

- `wrangler d1 export DB --local`：548 行 SQL，267 条 INSERT。
- 新建 scratch 库执行导入：users=8、messages=3，与源一致。
- 唯一索引 `idx_mail_messages_account_message_id` 随恢复还原。
- 源库未修改；未验证远端绑定切换、迁移台账与 R2 附件恢复。

## 5. 与诊断 API 的关系

管理员可通过 `GET /api/system/reliability` 的 `backupRunbook` 获取命令摘要；系统设置里的历史「可靠性后台」面板已移除。摘要中的 `<database>` 等占位值需要结合环境和私有配置使用，完整恢复流程以本文件为准。

## 6. 命令核验范围（2026-10-04）

已核对仓库安装的 `wrangler --version`（4.105.0）、`d1 export --help`、`d1 execute --help`、`r2 --help`、`r2 object --help`，以及 Cloudflare 官方 D1/R2 文档。该核验确认命令和配置步骤，不等于真实远端备份、导入、切库或 S3 同步演练。
