# 备份与恢复 Runbook

本 runbook 覆盖 WeMail 自托管部署的数据备份、恢复与恢复后验证。所有命令均在本地
环境完成过一次真实演练（导出 → 全新库恢复 → 校验行数与索引），演练记录见文末。

> 适用对象：独立部署 WeMail 的运维者。生产环境的数据库与桶名以 `wrangler.toml`
> 各 `env.*` 段的实际配置为准。

## 1. 数据面盘点

| 数据 | 位置 | 保留策略 | 备份必要性 |
| --- | --- | --- | --- |
| 用户、邮箱、消息元数据、设置、审计 | D1（`wemail-production`） | 消息按保留期由 cron 清理 | **高**：唯一事实源 |
| 附件二进制 | R2（`wemail-production-attachments`） | 随消息删除清理 | 中：按业务对附件的依赖决定 |
| Worker 配置 | `wrangler.toml` + GitHub Environment secrets | 随仓库 | 已随 git 管理 |

注意：D1 导出**不包含** R2 附件。只恢复 D1 时，消息记录完整，但附件下载会 404。

## 2. 备份

### 2.1 D1 导出（每日 / 每次发布前）

```bash
cd apps/worker
pnpm exec wrangler d1 export wemail-production --remote --output backup-$(date +%Y%m%d).sql
```

导出文件包含建表语句、全部数据行和索引定义（含入站幂等唯一索引
`idx_mail_messages_account_message_id`）。建议异地保存（对象存储、加密归档）。

### 2.2 R2 附件清单核对（每周）

```bash
pnpm exec wrangler r2 object list wemail-production-attachments --remote --prefix attachments/
```

如业务依赖附件完整性，用 S3 兼容 API（`wrangler r2 token create` 生成凭据）做桶级
同步到备份桶；附件随消息有保留期，属可再生数据，默认可不备份二进制。

## 3. 恢复

**恢复目标是全新数据库**：导出文件含 `CREATE TABLE`，对已有数据的库执行会在建表
阶段失败（这本身是一道防误覆盖的安全闸）。

```bash
# 1. 建新库
pnpm exec wrangler d1 create wemail-production-restore

# 2. 导入备份
pnpm exec wrangler d1 execute wemail-production-restore --remote --file backup-YYYYMMDD.sql

# 3. 切换绑定：编辑 wrangler.toml 的 [env.production.d1_databases]，
#    database_id 指向新库；R2 不变则无需动

# 4. 重新部署（迁移步骤对新库是空操作，导出已含全部 schema）
#    GitHub Actions: Deploy Cloudflare → production
```

回退到旧库 = 把 `database_id` 改回原值再部署一次，原库未被修改。

### 3.1 恢复后验证

```bash
# 行数核对（与备份时记录的数字对照）
pnpm exec wrangler d1 execute wemail-production-restore --remote \
  --command "SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM accounts) AS mailboxes, (SELECT COUNT(*) FROM mail_messages) AS messages"

# 幂等索引在位
pnpm exec wrangler d1 execute wemail-production-restore --remote \
  --command "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_mail_messages_account_message_id'"
```

应用层验证：健康检查 `GET /api/system/health` 返回 ok；登录一个已知账号；投递一封
测试邮件确认入站链路（幂等索引生效的最好证明：同一封重投只入库一次）。

## 4. 本地演练记录（2026-09-05）

- `wrangler d1 export DB --local`：548 行 SQL，267 条 INSERT
- 新建 scratch 库执行导入：users=8、messages=3，与源一致
- 唯一索引 `idx_mail_messages_account_message_id` 随恢复完整还原
- 演练产物已清理；源库未被修改

## 5. 与系统内诊断的关系

`GET /api/system/reliability` 的 `backupRunbook` 字段给出本页三条核心命令的摘要，
供运维在后台快速复制；完整步骤以本文件为准。
