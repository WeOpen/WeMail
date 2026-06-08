# WeMail 菜单化 API 指南

配套机器可读文档：`docs/openapi.yaml`。该文件由 `pnpm openapi:generate` 从 `apps/worker/src/modules/*/openapi.mjs` 汇总生成。

## 路径分组

WeMail 后端 API 已按管理后台左侧菜单分组，旧 `/auth`、`/admin`、`/api/mailboxes`、`/api/messages`、`/api/outbound`、`/api/keys`、`/api/telegram` 路径不再保留。

| 菜单 | 路径 |
| --- | --- |
| 认证 | `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/session` |
| 仪表盘 | `GET /api/dashboard` |
| 账号 | `GET /api/accounts`、`POST /api/accounts`、`DELETE /api/accounts/{id}`、`GET/PUT /api/accounts/settings` |
| 邮件 | `GET /api/mail/messages?accountId=...`、`GET /api/mail/messages/{id}`、`GET /api/mail/messages/{messageId}/attachments/{attachmentId}`、`GET /api/mail/outbound?accountId=...`、`POST /api/mail/send`、`GET/PUT /api/mail/settings` |
| 用户 | `GET /api/users`、`GET /api/users/accounts`、`GET/POST /api/users/invites`、`DELETE /api/users/invites/{id}`、`GET/PATCH /api/users/{userId}/quota` |
| API 密钥 | `GET /api/api-keys`、`POST /api/api-keys`、`DELETE /api/api-keys/{id}` |
| Webhook | `GET/POST /api/webhook/endpoints`、`PUT/DELETE /api/webhook/endpoints/{id}`、`GET /api/webhook/deliveries` |
| Telegram | `GET/PUT /api/telegram/subscription` |
| 公告 | `GET/POST /api/announcements` |
| 系统设置 | `GET /api/system/health`、`GET/PATCH /api/system/features` |

## 鉴权

- Session Cookie：浏览器工作台默认使用 `wemail_session`。
- API Key：外部调用使用 `Authorization: Bearer <token>` 或 `x-api-key: <token>`。
- 管理员能力：`/api/users/*`、`/api/system/features`、公告发布以及设置写入接口要求管理员角色和 Session 鉴权。

## 数据语义

- “账号”对应邮箱账号，原数据库 `mailboxes` 已迁移为 `accounts`。
- “用户”对应登录用户和成员管理，`users` 表保留。
- 邮件数据迁移到 `mail_messages`、`mail_attachments`、`mail_outbound_messages`。
- 设置和治理数据按菜单拆分到 `account_settings`、`mail_settings`、`webhook_*`、`announcements`、`system_settings`。

## 常用流程

1. 登录后恢复工作台：`POST /api/auth/login` -> `GET /api/auth/session`
2. 创建并读取账号邮件：`POST /api/accounts` -> `GET /api/mail/messages?accountId=...`
3. 外发邮件：`POST /api/mail/send` -> `GET /api/mail/outbound?accountId=...`
4. 管理用户：`GET /api/users` -> `GET/PATCH /api/users/{userId}/quota`
5. 接入系统事件：`POST /api/webhook/endpoints` -> `GET /api/webhook/deliveries`
