# WeMail 菜单化 API 指南

配套机器可读文档：`docs/openapi.yaml`。该文件由 `pnpm openapi:generate` 从 `apps/worker/src/modules/*/openapi.mjs` 汇总生成。

## 路径分组

WeMail 后端 API 已按管理后台左侧菜单分组，旧 `/auth`、`/admin`、`/api/mailboxes`、`/api/messages`、`/api/outbound`、`/api/keys`、`/api/telegram` 路径不再保留。

| 菜单 | 路径 |
| --- | --- |
| 认证 | `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/session` |
| 仪表盘 | `GET /api/dashboard` |
| 账号 | `GET /api/accounts`、`POST /api/accounts`、`DELETE /api/accounts/{id}`、`GET/PUT /api/accounts/settings` |
| 邮件 | `GET /api/mail/messages?accountId=...&page=...&filter=...`、`GET /api/mail/messages/{id}`、`GET /api/mail/messages/{messageId}/attachments/{attachmentId}`、`GET /api/mail/outbound?accountId=...&page=...&status=...`、`GET /api/mail/outbound/{id}`、`POST /api/mail/send`、`GET/PUT /api/mail/settings` |
| 用户 | `GET /api/users`、`GET /api/users/accounts`、`GET/POST /api/users/invites`、`DELETE /api/users/invites/{id}`、`GET/PATCH /api/users/{userId}/quota` |
| API 密钥 | `GET /api/api-keys`、`POST /api/api-keys`、`DELETE /api/api-keys/{id}` |
| Webhook | `GET/POST /api/webhook/endpoints`、`PUT/DELETE /api/webhook/endpoints/{id}`、`GET /api/webhook/deliveries` |
| Telegram | `GET /api/telegram/overview`、`GET/PUT /api/telegram/subscription`、`POST /api/telegram/link-code`、`POST /api/telegram/bot-menu`、`POST /api/telegram/webhook`、`POST /api/telegram/test-message`、`GET /api/telegram/deliveries` |
| 公告 | `GET/POST /api/announcements`、`GET/PATCH/DELETE /api/announcements/{id}`、`POST /api/announcements/{id}/receipt`；列表支持 `q/type/status/time/scope` 服务端查询 |
| 系统设置 | `GET /api/system/health`、`GET/PATCH /api/system/features` |

## 鉴权

- Session Cookie：浏览器工作台默认使用 `wemail_session`。
- API Key：外部调用使用 `Authorization: Bearer <token>` 或 `x-api-key: <token>`。
- 管理员能力：`/api/users/*`、`/api/system/features`、公告发布以及设置写入接口要求管理员角色和 Session 鉴权。

## 数据语义

- “账号”对应邮箱账号，原数据库 `mailboxes` 已迁移为 `accounts`。
- `GET /api/accounts` 不带查询参数时返回当前用户全部账号；传 `page`、`pageSize` 或 `search` 时返回 `{ mailboxes, total, page, pageSize }`，用于邮箱选择弹窗的服务端分页和搜索。管理员分页查询返回所有用户的启用账号，并带 `createdBy`、`createdByName`。
- “用户”对应登录用户和成员管理，`users` 表保留。
- 邮件数据迁移到 `mail_messages`、`mail_attachments`、`mail_outbound_messages`；Cloudflare Email Routing 收到未匹配系统账号的地址时，会保留为管理员可见的未匹配邮件。
- 发件记录支持服务端分页、搜索和 `all/sent/failed` 状态筛选；详情接口会返回正文、实际发给 provider 的请求 payload、provider 响应和 message id，便于审计。
- 设置和治理数据按菜单拆分到 `account_settings`、`mail_settings`、`webhook_*`、`announcements`、`system_settings`。
- Webhook 端点支持 `channel` 字段：`webhook`（默认，投递完整 JSON 事件包并带签名头）、`slack` / `discord` / `feishu` / `wecom`（按对应平台的传入式 Webhook 消息格式投递）。通知规则可以按渠道定向（`target` 取渠道名）。
- 投递记录的 `payload` 保留原始事件，`requestBodyText` 保留发送给平台的请求体。重试从原始事件重新生成平台消息；旧通用 JSON 记录继续可重试，缺少原始事件的旧聊天记录会明确报错，需要重新发起事件。所有渠道都有 10 秒超时；Slack、飞书、企业微信还校验平台业务响应。签名仍对实际发送的请求体计算。
- Discord 使用 `wait=true` 并核对创建的消息 ID，禁用邮件文本触发的自动 mentions。聊天文本按 UTF-8 字节截断并为主提取值与有效期保留空间；完整原始数据仍保存在事件记录中。
- 入站通知任务与邮件元数据在同一 D1 事务提交，失败由每分钟 cron 恢复，最多自动尝试五次。`GET /api/notification/deliveries` 返回本人状态统计与最近任务元数据，可按 `target` 筛选；`POST /api/notification/deliveries/{id}/retry` 重放本人未过期的失败/等待重试/暂停任务。管理员通过 `GET /api/system/notification-status` 查看全站统计。
- `POST /api/notification/rules/test` 对样本事件返回 `shouldSend` 与逐条匹配/抑制原因，不发送通知。规则 `quietHoursTimezone` 使用 IANA 时区；既有或旧客户端未指定时区的规则继续按 UTC 解释，支持跨午夜免打扰。
- 调整旧规则时，用 `PUT /api/notification/rules/{id}` 提交原有完整规则并增加 `quietHoursTimezone`；仅新增时区字段不会改变原先的邮箱、关键词或目标条件。自动重试最多五次，用户手动重放会开启新一轮计数，事件 ID 保持不变。
- 邮件详情的 `extraction` 是最佳单项发现（兼容字段）；`extractions` 返回全部发现（验证码、各分类链接），`expiresHint` 为验证码有效期提示，`authSummary` 为 SPF/DKIM/DMARC 判定。提取支持中文验证码关键词与 List-Unsubscribe 头。

## 常用流程

1. 登录后恢复工作台：`POST /api/auth/login` -> `GET /api/auth/session`
2. 创建并读取账号邮件：`POST /api/accounts` -> `GET /api/mail/messages?accountId=...&page=1&pageSize=10`
3. 外发邮件：`POST /api/mail/send` -> `GET /api/mail/outbound?accountId=...&page=1&pageSize=6` -> `GET /api/mail/outbound/{id}`
4. 管理用户：`GET /api/users` -> `GET/PATCH /api/users/{userId}/quota`
5. 接入系统事件：`POST /api/webhook/endpoints` -> `GET /api/webhook/deliveries`
6. 接入 Telegram 通知：配置 BotFather token 和 webhook -> 管理员调用 `POST /api/telegram/bot-menu` 配置 Bot 命令菜单 -> `GET /api/telegram/overview` -> `POST /api/telegram/link-code` -> Telegram Bot webhook 调用 `POST /api/telegram/webhook` 完成自动绑定 -> `POST /api/telegram/test-message` -> `GET /api/telegram/deliveries`

Telegram 自动绑定依赖 `TELEGRAM_BOT_TOKEN`；配置 `TELEGRAM_BOT_USERNAME` 后，绑定码响应会包含可直接打开的 `https://t.me/...` deep link。staging/production 环境启用 Telegram 时必须配置 `TELEGRAM_WEBHOOK_SECRET`，除非显式设置 `ENABLE_TELEGRAM=false`，并在 Telegram webhook secret token 请求头中校验。Bot 菜单当前包含 `/help`、`/status`、`/accounts`、`/messages`、`/pause`、`/resume`、`/test`，用户绑定后可直接在 Telegram 操作自己的后台数据。
