# WeMail 交接记录

## 2026-11-20：从开发计划会话续接

当前分支 `codex/development-roadmap`，上轮 DEV-01～05 已推送草稿 PR #41。

- Resend 409 需区分 `concurrent_idempotent_requests` 与永久幂等冲突。网络、408、5xx、无有效邮件 ID 的 2xx 可能已受理；持久化 submission_uncertain，后续永久拒绝不能将未知结果改为确定失败。供应商响应后的 D1 写入失败保留租约，恢复复用原键。23 小时截止为供应商 24 小时窗口预留余量。
- 逻辑请求与额度在同一事务；自动重试不扣第二次。所有发件入口复用带提交锁的抽屉，网络重试保留键、修改内容换键，避免完成的旧请求重置新编辑。新状态需完整处理，sending 不能称已受理；终态残留 nextAttemptAt 不能显示为未来重试。
- DNS 比较类型、MX 优先级/主机、分段 TXT 与内部空白、CNAME 大小写/尾点。查询显式触发、有总时限/大小/分页/并发限制，配置读取不查询外部服务。
- 事件名称不能用原型链查找视为已知事件；签名正确仍需校验 data/detail。早到事件缓冲，事件去重与终态防降级。重试测试必须返回新的 Response，避免重复消费 body 造成伪故障。
- 原始 MIME 即使声称 `mx.cloudflare.net` 也不可信；只由平台 message.headers 首条且精确 authserv-id 建立信任。旧来源缺失为未验证。固定 96% 置信度和正文中不存在的 AI 值均不能视为质量证据。
- 多链接提取必须限制数量/长度；AI grounding 只保证值存在原文，不证明模型理解。fallbackLimit 目前只统计成功提取，不是所有失败调用费用的精确上限。
- 活跃入口 WorkspaceApp 曾显式关闭 diagnostics/reliability；只给路由传 store 字段无法加载数据。管理员系统页启用既有请求，保持无额外轮询。首信判断不能受当前附件/日期/搜索/分页筛选限制；检查收件重置为本邮箱第一页全量查询。
- 新文档尚未合并时指向 GitHub main 会 404，源码中的 `/docs/` 链接也无法在 GitHub 正确导航。应用按需渲染同批文档纯 Markdown；禁用 raw HTML 和 MDX 执行，内容与图片随当前构建。
- 本机 node_modules 由 pnpm 11 store 安装，而项目锁定 pnpm 10.18.2。添加依赖遇 store 不匹配时不要改全局配置；本轮跨版本添加依赖后 Docs CLI 链接失效，最终用项目 pnpm 10 的 `pnpm install --frozen-lockfile --force` 重建本地依赖后恢复。锁文件只保留新增所需条目，CI 继续使用项目版本与 frozen lockfile。
- Playwright 浏览器缓存缺少当前 Chromium 会导致浏览器场景无法启动，API 场景仍可能通过；先安装项目浏览器再完整重跑。E2E 每个注册场景使用不同邀请码/邮箱编号；page.request 注册会共享浏览器 Cookie，随后直接打开工作台，不能再期待登录表单。

实际验证与发布门槛见 `docs/plans/2026-10-04-development-execution.md`。真实供应商、真实 Workers AI、staging 和生产性能必须独立验证，不把本地受控供应商当线上证据。

- 2026-11-20 GitHub ubuntu-latest 已切到26.04，项目Playwright1.59.1的安装器不支持该OS。E2E两个job已固定ubuntu-24.04；浏览器安装失败不能算产品用例失败，也不能通过重复重跑解决。

- 早到供应商事件合并与发送完成必须同一个 D1 batch。先 accepted 清 lease 后单独合并，第二写失败会永久漏掉已保存 delivered。已用触发器故障注入验证回滚、lease 接管与单次额度。
