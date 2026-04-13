# 🧭 后端 API 使用指南

本文按前端页面和实际业务流程解释 `apps/worker` 已实现接口如何配合使用。

配套机器可读文档：`docs/openapi.yaml`

## 1. 鉴权方式

### 1.1 Session Cookie

适用场景：
- Web 前端页面调用
- 用户登录后的大多数接口
- 所有管理员接口

特点：
- 注册或登录成功后，后端会写入 Session Cookie
- 后续浏览器请求自动携带 Cookie
- 管理接口要求管理员角色，且必须是 Session 鉴权

相关接口：
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

### 1.2 API Key

适用场景：
- 脚本调用
- CLI 或服务端自动化调用

传递方式：
- `Authorization: Bearer <token>`
- `x-api-key: <token>`

注意：
- API Key 可用于大多数用户态接口
- 不能用已有 API Key 再创建新的 API Key
- 管理接口不能用 API Key 替代管理员 Session

相关接口：
- `GET /api/keys`
- `POST /api/keys`
- `DELETE /api/keys/{id}`

## 2. 注册与登录流程

### 2.1 新用户注册

前提：管理员先创建邀请码。

调用顺序：
1. `POST /auth/register`
2. 浏览器拿到 Session Cookie
3. `GET /auth/session` 确认当前登录状态和功能开关

请求示例：

```json
{
  "email": "member@example.com",
  "password": "password123",
  "inviteCode": "INVITE-ABCD1234"
}
```

成功后返回：
- 用户信息
- 当前功能开关
- 响应头里的 Session Cookie

常见失败：
- `403 Invite is invalid`
- `409 User already exists`
- `429 Rate limit exceeded`

### 2.2 已有用户登录

调用顺序：
1. `POST /auth/login`
2. `GET /auth/session`

常见失败：
- `401 Invalid credentials`
- `429 Rate limit exceeded`

### 2.3 退出登录

调用：
- `POST /auth/logout`

用途：
- 清理 Cookie
- 删除当前服务端 Session

## 3. 邮箱管理流程

### 3.1 获取邮箱列表

调用：
- `GET /api/mailboxes`

用途：
- 进入邮箱页时拉取当前用户的全部邮箱

返回核心字段：
- `id`
- `address`
- `label`
- `createdAt`

### 3.2 创建邮箱

调用：
- `POST /api/mailboxes`

请求示例：

```json
{
  "label": "Primary inbox"
}
```

说明：
- 后端会自动生成邮箱地址
- 地址域名来自后端配置 `DEFAULT_MAIL_DOMAIN`
- 若请求体为空，会回退到默认标签 `Temporary inbox`

常见失败：
- `401 Authentication required`
- `403 Mailbox creation disabled`
- `403 Mailbox limit reached`
- `429 Rate limit exceeded`

### 3.3 删除邮箱

调用：
- `DELETE /api/mailboxes/{id}`

用途：
- 删除当前用户自己的邮箱

常见失败：
- `404 Mailbox not found`

## 4. 收信与读信流程

### 4.1 拉取消息列表

调用：
- `GET /api/messages?mailboxId={mailboxId}`

用途：
- 进入某个邮箱详情页时拉取消息列表

返回核心字段：
- `fromAddress`
- `subject`
- `previewText`
- `extraction`
- `attachmentCount`
- `receivedAt`

其中 `extraction` 表示后端从邮件中提取出的结构化结果，例如验证码、链接等。

### 4.2 查看消息详情

调用：
- `GET /api/messages/{id}`

用途：
- 打开某一封邮件查看正文和附件信息

返回会包含：
- `bodyText`
- `attachments`
- `oversizeStatus`

### 4.3 下载或查看附件

调用：
- `GET /api/messages/{messageId}/attachments/{attachmentId}`

返回有两种情况：
- 未配置 R2：返回附件元数据 JSON
- 已配置 R2：直接返回附件二进制流

前端建议：
- 先按响应 `content-type` 判断是 JSON 还是文件流
- 文件流场景按下载处理

## 5. 外发邮件流程

### 5.1 查看外发记录

调用：
- `GET /api/outbound?mailboxId={mailboxId}`

用途：
- 在某个邮箱的“外发记录”页展示历史发送结果

返回核心字段：
- `toAddress`
- `subject`
- `status`
- `errorText`
- `createdAt`

### 5.2 发送邮件

调用：
- `POST /api/outbound/send`

请求示例：

```json
{
  "mailboxId": "mailbox_001",
  "toAddress": "target@example.com",
  "subject": "Hello",
  "bodyText": "World"
}
```

成功返回：
- `ok`
- 最新配额状态 `quota`

前端应关注的失败：
- `403 Outbound sending disabled`
- `403 Outbound quota exhausted`
- `404 Mailbox not found`
- `503 Resend not configured`
- `502` 第三方发送失败
- `429 Rate limit exceeded`

## 6. 个人设置流程

### 6.1 Telegram 通知设置

读取：
- `GET /api/telegram`

更新：
- `PUT /api/telegram`

请求示例：

```json
{
  "chatId": "123456789",
  "enabled": true
}
```

常见失败：
- `403 Telegram disabled`

### 6.2 API Key 管理

列表：
- `GET /api/keys`

创建：
- `POST /api/keys`

吊销：
- `DELETE /api/keys/{id}`

创建时说明：
- 必须使用 Session 鉴权
- 创建成功后只会返回一次完整 `secret`
- 前端必须立即提示用户保存

## 7. 管理后台流程

所有管理接口都要求：
- 当前用户角色为 `admin`
- 使用 Session Cookie 鉴权

### 7.1 用户管理

调用：
- `GET /admin/users`

用途：
- 查看系统用户列表

### 7.2 邀请码管理

列表：
- `GET /admin/invites`

创建：
- `POST /admin/invites`

禁用：
- `DELETE /admin/invites/{id}`

说明：
- 邀请码列表中的 `status` 可能是：`ready`、`redeemed`、`disabled`

### 7.3 邮箱管理

调用：
- `GET /admin/mailboxes`

用途：
- 查看全系统邮箱列表

### 7.4 外发配额管理

读取：
- `GET /admin/quotas/{userId}`

更新：
- `PATCH /admin/quotas/{userId}`

请求示例：

```json
{
  "dailyLimit": 50,
  "disabled": false
}
```

说明：
- 这两个字段都可选
- 未传字段会保留原值

### 7.5 功能开关管理

读取：
- `GET /admin/features`

更新：
- `PATCH /admin/features`

请求示例：

```json
{
  "outboundEnabled": false,
  "telegramEnabled": false
}
```

用途：
- 控制 AI、Telegram、外发、邮箱创建等全局能力

## 8. 常见错误码

- `400`：请求参数或请求体不合法
- `401`：未登录或未提供有效用户鉴权
- `403`：功能关闭、权限不足、管理员 Session 缺失、配额受限
- `404`：目标资源不存在
- `409`：资源冲突，例如重复注册
- `429`：请求过于频繁
- `502`：下游外部服务调用失败
- `503`：必要外部能力未配置

## 9. 页面到接口映射表

| 前端页面 / 模块 | 主要接口 | 说明 |
| --- | --- | --- |
| 登录页 | `POST /auth/login` | 登录成功后依赖 Cookie 维持会话 |
| 注册页 | `POST /auth/register` | 需要邀请码 |
| 顶部会话初始化 | `GET /auth/session` | 页面刷新后恢复用户状态和功能开关 |
| 邮箱列表页 | `GET /api/mailboxes` | 获取当前用户全部邮箱 |
| 新建邮箱弹窗 | `POST /api/mailboxes` | 创建新的临时邮箱 |
| 邮箱详情页 | `GET /api/messages?mailboxId=...` | 拉取当前邮箱消息列表 |
| 邮件详情抽屉 / 页面 | `GET /api/messages/{id}` | 查看正文、提取结果、附件 |
| 附件下载按钮 | `GET /api/messages/{messageId}/attachments/{attachmentId}` | 返回 JSON 元数据或文件流 |
| 外发记录页 | `GET /api/outbound?mailboxId=...` | 查看当前邮箱历史外发 |
| 外发发送弹窗 | `POST /api/outbound/send` | 发送邮件并返回最新配额 |
| Telegram 设置页 | `GET /api/telegram` / `PUT /api/telegram` | 读取和更新 Telegram 通知 |
| API Key 设置页 | `GET /api/keys` / `POST /api/keys` / `DELETE /api/keys/{id}` | 管理个人 API Key |
| 管理员用户页 | `GET /admin/users` | 查看用户列表 |
| 管理员邀请码页 | `GET /admin/invites` / `POST /admin/invites` / `DELETE /admin/invites/{id}` | 管理邀请码 |
| 管理员邮箱页 | `GET /admin/mailboxes` | 查看全系统邮箱 |
| 管理员配额页 | `GET /admin/quotas/{userId}` / `PATCH /admin/quotas/{userId}` | 查看和修改外发配额 |
| 管理员功能开关页 | `GET /admin/features` / `PATCH /admin/features` | 管理全局功能开关 |

## 10. 推荐前端接入顺序

### 普通用户端

1. 注册或登录
2. 获取当前会话
3. 获取邮箱列表
4. 创建邮箱
5. 获取消息列表
6. 获取消息详情
7. 按需读取附件
8. 配置 Telegram / API Key / 外发能力

### 管理后台

1. 管理员登录
2. 获取当前会话确认角色
3. 查看用户 / 邀请码 / 邮箱
4. 维护用户配额
5. 调整功能开关

## 11. 页面典型调用顺序

### 11.1 应用启动

1. `GET /auth/session`
2. 若 200，则进入已登录态
3. 若 401，则停留在登录或注册入口

### 11.2 用户注册完成后首次进入系统

1. `POST /auth/register`
2. `GET /auth/session`
3. `GET /api/mailboxes`
4. 若为空，可引导调用 `POST /api/mailboxes`

### 11.3 用户打开某个邮箱

1. `GET /api/mailboxes`
2. `GET /api/messages?mailboxId=...`
3. 用户点击某封邮件后调用 `GET /api/messages/{id}`
4. 如有附件，再调用 `GET /api/messages/{messageId}/attachments/{attachmentId}`

### 11.4 用户发送外发邮件

1. `GET /api/mailboxes`
2. `POST /api/outbound/send`
3. 成功后再调用 `GET /api/outbound?mailboxId=...` 刷新记录

### 11.5 管理员进入后台

1. `POST /auth/login`
2. `GET /auth/session` 确认 `role=admin`
3. 并行或按需调用：
   - `GET /admin/users`
   - `GET /admin/invites`
   - `GET /admin/mailboxes`
   - `GET /admin/features`
4. 当用户详情页打开时，再调用 `GET /admin/quotas/{userId}`
5. 修改后调用：
   - `PATCH /admin/quotas/{userId}`
   - `PATCH /admin/features`
