# Staging 邮件业务验收

本地 `pnpm test:e2e:business` 验证真实 Worker/D1/R2 与浏览器协同，外部供应商为受控替身。本清单记录真实 Email Routing、邮件供应商与聊天平台的独立验收。

## 环境准备

- 隔离 staging D1、KV、R2 与 Pages/Worker 域名，应用全部 migrations；真实 ID 通过 staging GitHub Environment secrets 注入。
- 核对 Cookie/CORS、Email Routing 域名和收件规则、启用功能与密钥；已有诊断只证明配置存在，需下列实际操作证明服务可用。
- 为本次验收创建专用用户、邮箱、API Key 和通知目标；以专用测试收件地址完成发件验证。

## 验收步骤

| 项目 | 实际操作 | 必须记录的证据 |
| --- | --- | --- |
| 认证与权限 | 邀请注册、登录、第二用户访问第一用户邮箱、缺 scope 与撤销 Key 后调用 | commit、角色、HTTP 状态；不记录密钥和 Cookie |
| 真实收件 | 从外部测试邮箱向 staging 创建地址发送中英文验证码、多个链接与有效期邮件 | Email Routing 事件、Message-ID、入库 ID、到达时间、提取结果 |
| 幂等 | 使用同一 Message-ID 重投，再以新 Message-ID 发送相同正文 | 第一次/重复/新消息的 ID 与数量 |
| HTML/附件 | 发 HTML-only 邮件及含附件邮件，读取正文并下载附件 | 可读正文、文件名/大小、下载校验结果 |
| 通知与恢复 | 为五种 Webhook 渠道及 Telegram 创建专用目标，核对实际收到的内容；使用可控接收端制造失败再重放 | 稳定事件/尝试 ID、平台消息 ID、重试状态、主题/验证码/有效期；平台真实目标不能用模拟响应替代 |
| 发件与额度 | 发送到专用外部测试邮箱，核对收件，达到测试额度后再次发送 | 供应商 ID、收件时间、失败/限额状态；后续新增投递事件也需核对最终状态 |
| 清理与恢复 | 验证保留期清理记录、附件同步清理；导出并恢复到全新隔离 D1，核对索引与数据 | cleanup run ID、恢复数据库/备份时间、行数/索引、恢复后登录和收件 |

## 记录模板

```markdown
- 日期 / 时区：
- 发布 commit / 版本：
- Worker / Pages deployment URL：
- 数据库与环境（不含访问凭证）：
- 验收项目：
- 实际操作与 Message-ID / provider ID / delivery ID：
- 预期与实际结果：
- 日志 / 截图 / CI artifact 链接：
- 遗留问题与严重程度：
- 是否放行：
```

关闭或撤销专用验收凭证，按保留期清理测试数据。全部必要项目通过前不把本地测试记为“线上已验收”。production 放行与观察仍遵循 `deploy-runbook.md`。
