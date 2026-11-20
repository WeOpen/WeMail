# DEV-06 发件闭环实施记录

状态：2026-11-20 本地实现与验收通过，等待本批远端 CI 和真实 staging 供应商验证。

## 已验证

`shared/resend-webhook.ts` 使用 Web Crypto 验证原始请求体、Svix 消息 ID、签名与五分钟时间窗口。独立官方测试向量、签名轮换、请求体/ID/时间戳篡改、错误密钥、过期/未来时间与缺失/超长头已由三个用例验证；已接入实际路由和 D1 事件事务，并覆盖去重、早到关联、乱序与异常载荷。

## 实现决策

1. 新建持久化发送请求与尝试/供应商事件结构。每个用户的请求键唯一；原始用户参数生成指纹，同键不同内容返回冲突，重试复用第一次冻结的供应商请求体。
2. 逻辑发送请求、发件历史与额度扣减在同一 D1 batch 中提交。通过条件 INSERT 与仅针对新请求的 UPDATE 保证并发额度和重复请求不会重复扣额。配额按系统已接受的逻辑请求计数，失败也保留计数以控制滥用；自动重试不扣第二次。
3. 首次发送只尝试一次，临时故障进入持久化重试；重试间隔取实际设置，HTTP 408/429/5xx 和网络故障可重试，永久错误终止。调度沿用条件领取、租约 token 和有上限的并行度，按正确的等待时间执行。
4. 供应商请求带稳定的 Idempotency-Key。持久化首次尝试时间，防止超出供应商幂等窗口后自动重发不确定请求；超窗结果明确标为未知，需要核对或用户主动发起新的逻辑请求。
5. Webhook 路由先验证原始请求体，再按 Svix ID 去重并保存事件。事件可以早于供应商 ID 的本地写入，需缓冲并在关联后应用；较晚到达的 sent/accepted 不得把 delivered/bounced/complained 降级。
6. 新状态区分 queued、sending、accepted、delivered、bounced、complained、failed 与 uncertain；旧 sent 保留读取兼容并说明只证明历史提交。前端显示状态时间线、失败原因、下次尝试与新请求补发，发送草稿在网络失败重试时保留请求键。
7. 静态发件身份检查标注 configuration 来源；真实供应商域名/DNS 检查使用独立请求，显示来源与检查时间，不在配置读取时伪装为已验证。

## 验证与剩余门槛

原子额度、同键重放/冲突、网络结果未知、Retry-After/实际等待、23小时安全窗口、旧sent兼容、签名/去重/乱序/早到、状态过滤/跨用户404、DNS规范化与超时预算均有回归。最终迁移测试13项，恢复9项、路由6项、DNS3项、验签3项。真实本地业务E2E包含D1供应商键复用、早到回调与桌面/手机时间线。

发送受理、供应商ID关联、已缓存事件的状态合并在同一D1 batch。故障注入断言失败后保留sending/原lease，接管后可到delivered且quota=1。HTTP408/5xx也可能已受理，重试耗尽保持uncertain/202；永久4xx为failed/502。

两个前端发件入口复用同一提交锁和草稿幂等行为，网络失败保留键，编辑内容换键。状态提示覆盖九种状态，最终投递不显示旧nextAttemptAt。API目录、OpenAPI、迁移schema、CHANGELOG和部署验收手册已同步。

真实Resend幂等/事件、公共DNS和staging迁移备份恢复仍待隔离环境验证。当前staging secrets/variables为空，未进行线上发布。

## 官方依据

- [Resend 发送 API](https://resend.com/docs/api-reference/emails/send-email)
- [幂等键与保留窗口](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [回调验签](https://resend.com/docs/webhooks/verify-webhooks-requests)
- [Svix 原始内容与签名算法](https://docs.svix.com/receiving/verifying-payloads/how-manual)
- [供应商事件语义](https://resend.com/docs/webhooks/event-types)
