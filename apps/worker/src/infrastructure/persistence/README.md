# 💾 infrastructure/persistence

持久化实现层。

## ✅ 放什么
- D1 store
- in-memory store
- repository / store adapter

## 🚫 不放什么
- 路由逻辑
- 页面响应层

## 🗂️ D1 store 结构

`d1.ts` 是唯一公共入口（`createD1Store`），按聚合组合 `d1/` 下的模块：

| 模块 | 职责 |
|---|---|
| `d1/shared.ts` | 跨模块纯辅助：分页、布尔/JSON 解析、scope 解析 |
| `d1/row-mappers.ts` | 数据库行 → 领域记录的映射函数 |
| `d1/users.ts` | users / userPreferences / sessions / oauth* / invites / apiKeys |
| `d1/mail.ts` | mailboxes / messages / attachments / outboundMessages |
| `d1/settings.ts` | settings / runtimeSettings / mailDomains / dictionaries / accountSettings / mailSettings / quotas |
| `d1/ops.ts` | audit / cleanupRuns / telegram / webhook* / notificationRules |
| `d1/announcements.ts` | 公告聚合；SQL 过滤构造见 `announcement-sql.ts` |

新增聚合时：在 `d1/` 建模块、导出 `create<Aggregate>Aggregate(db)`，并在 `d1.ts` 组装。行映射统一放 `row-mappers.ts`。`in-memory.ts` 与 D1 实现保持接口对等，由集成测试约束。
