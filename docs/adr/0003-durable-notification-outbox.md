# 0003：入站邮件的持久化通知任务

日期：2026-10-06。状态：采用；对应 DEV-04。

## 问题

原流程先保存邮件，再调用 Telegram/Webhook。保存后进程中断时，重投邮件会被 Message-ID 幂等检查抑制，尚未发送的通知无法恢复。只在邮件保存之后插入任务仍存在同样的中断窗口。

## 决策

应用层在保存前根据用户目标和通知规则准备任务快照。邮件元数据与任务通过一次 D1 `batch` 提交；其中任一写入失败会回滚整批。内存 store 保持对应行为。并发入站的 Message-ID 唯一索引仍是最后一道保护，失败的重复事务不会留下额外任务。

首次尝试由 Email handler 的 `waitUntil` 驱动，保存后的调度故障留下待处理任务。每分钟 Cron 从 D1 恢复到期任务；每小时保留期清理单独执行。投递每批最多 20 项、四项并行，各外部请求限制为 10 秒。任务使用两分钟租约、独立的随机租约 token；领取通过单个有条件的 UPDATE 完成，过期执行器无法覆盖新执行器的结果。

任务按事件 ID、渠道和目标唯一。事件 ID 在重试中保持不变，尝试 ID 每次生成，通用 Webhook 带 `x-wemail-event-id` 供接收方去重。网络故障、HTTP 408/429/5xx 使用 30 秒起的指数退避，尊重有上限的 Retry-After，最多五次尝试。永久错误进入失败终态；已停用或变化的目标进入 suppressed。手动重放只允许资源所属用户操作未过期、未在投递的任务，复用相同状态机。

## Cron 与 Queues 的评估

选择 D1 + Cron 作为当前自托管默认路径：复用已有 D1 与 Worker，不要求新增队列资源、消费者绑定和单独配置。代价是每分钟调度、查询与状态写入，以及后台恢复最多约一分钟的调度粒度；不能将这些资源消耗描述为免费或无上限。

Queues 可提供更及时的唤醒与更高的批量吞吐，但需要新增部署资源和绑定，并按其操作量/套餐计费。若待处理量持续积压，可将 Queues 加为唤醒与分发机制；D1 仍作为任务事实源，保留事务、去重和租约约束。这次不引入双写 D1/Queues 的一致性窗口。

## 数据与投递边界

- 邮件元数据和通知意图的提交具有事务边界，R2 文件上传不属于 D1 事务。
- 外部投递采用至少一次语义；供应商受理后本地结果写入前中断，可能再次投递。不能声称端到端 exactly-once。
- 任务保存必要的事件内容，其到期时间与源邮件相同。过期任务和相关 Webhook 尝试一起清理；显式删除邮件也清理其任务与尝试。Telegram 审计不复制验证码或原始邮件内容。
- 既有邮件不自动补发历史通知，避免升级造成历史消息群发。旧通用 Webhook 记录继续可手动重放；缺少原始事件的旧聊天记录维持明确错误。

## 验证

覆盖事务内任务写入故障后的回滚、并发领取、过期租约接管、旧租约结果拒绝、派发中断后恢复、重复入站去重、限流退避、永久失败、独立目标投递、Telegram 事件别名、敏感内容过期/删除与手动重放。真实本地业务 E2E 验证 D1/R2 与生产路由；外部平台仍需 staging 验收。

## 依据

- [D1 batch 的事务和回滚契约](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Queues 计费](https://developers.cloudflare.com/queues/platform/pricing/)
- [Email handler 与执行上下文](https://developers.cloudflare.com/email-service/api/route-emails/email-handler/)
