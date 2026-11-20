# WeMail 开发计划执行记录

目标：按顺序完成 [开发计划](2026-10-03-next-development-roadmap.md) 的全部实现与验收。开始日期：2026-10-04。代码分支：`codex/development-roadmap`。

## 进度与证据

| 工作项 | 当前状态 | 已获得的证据 / 待完成项 |
| --- | --- | --- |
| DEV-01 聊天渠道修复 | 本地验收通过 | 31 个重放/内容/响应/超时回归通过；2 个空库/升级/D1 保存回归通过；完整批次检查通过；迁移 0024 与 schema 同步 |
| DEV-02 基线与文档 | 本地验收通过 | 完整 lint/typecheck/test/build/E2E 复验通过；overlay 竞态与 API Key 复制计时器泄漏修复；历史状态与部署/恢复文档已纠偏 |
| DEV-03 真实业务 E2E | 本地与 CI 通过 | 本地与 Linux CI 的真实业务 E2E 7/7，通过浏览器主流程、权限/额度、幂等、HTML/R2、通知重放/恢复与发件；供应商仍为受控适配器 |
| DEV-04 持久化通知 | 本地与 CI 通过 | 事务内任务、原子领取/租约、退避/Retry-After、失败/抑制终态、重放和保留期/删除清理已验证；ADR 0003 已记录；真实外部平台待发布阶段验收 |
| DEV-05 状态与规则解释 | 本地与 CI 通过 | 状态面板、管理员统计、重放、规则试运行、UTC/IANA 时区/跨午夜与权限验证通过；桌面与 375px 手机验证通过 |
| DEV-06 发件闭环 | 本地验收通过 | 持久化请求/额度事务、稳定幂等键、实际延迟重试、签名事件/早到关联/乱序、旧记录兼容、投递时间线和独立 DNS 检查完成；真实供应商待 staging |
| DEV-07 提取质量 | 本地验收通过，真实 AI 待验证 | 60 封固定合成样本，精确率 68.97% → 100%、召回率 85.11% → 100%；认证头可信来源、多结果复制、有效期提示与 AI 原文依据护栏完成；真实模型指标/费用待 staging |
| DEV-08 首次使用 | 本地验收通过 | 首信创建/收件/复制/通知引导、管理员诊断与修复入口、三条任务指南及应用内阅读完成；实际 Worker/D1 浏览器流程与手机页面通过 |
| 发布验收 | 本地完成，staging 环境待配置 | 本地四工作区与两套 E2E 通过，迁移空库/升级/事务故障恢复通过；staging secrets/variables 当前为空，真实服务、隔离备份恢复与 production 观察待执行 |
| 团队与商业模型候选 | 后续候选 | 本轮只纠正部署级摘要含义；完整团队功能不计入当前实现承诺 |

## 阶段一发现与修复

- Webhook 原始事件与实际平台请求体分开保存，签名仍针对实际请求体计算。
- 旧聊天记录缺少原始事件时拒绝空白重放；旧通用 JSON 记录继续兼容。
- 聊天文本展示多提取值和有效期，限制 UTF-8 长度；所有渠道 10 秒超时，响应读取受限。
- 本地 `schema.sql` 缺少既有 Message-ID、channel 列与两个索引，已补齐并加入迁移快照一致性回归。
- 初始基线见 [验证报告](2026-10-04-validation-baseline.md)。测试中原有邀请码失败按实际根因修复，不放宽原有断言。

## 续跑约定

本聊天长期目标保留。每小时定时续跑任务 `wemail` 已于 2026-10-05 按用户要求删除，不重新创建定时任务。后续依据当前目标的继续指令、当前文件和实际测试证据推进剩余任务。

每轮结束前更新本记录。复用仍在运行的具体工具会话；进程已结束后从下一项继续。不要把“实现存在”“定向测试通过”“线上已验收”混为同一状态。

## 环境核对

- GitHub 仓库 `WeOpen/WeMail` 可访问；本地 Cloudflare OAuth 可用。
- GitHub staging Environment secrets/variables 的列表目前为空，需要在发布阶段核对/配置真实隔离资源。
- 本地开发阶段继续使用隔离测试资源，不把尚未验证的线上状态视为完成。

## 当前验证运行

- 定向 DEV-01：`tests/webhook-delivery-recovery.test.ts` 31/31；当前完整 Worker 测试通过。
- 数据库：`tests/database-migrations.test.ts` 2/2；全部 25 个 migrations 可应用到空 SQLite 库。
- 2026-10-05 完整批次复验：lint 4.56 秒、typecheck 6.10 秒、test 10.11 秒、build 8.63 秒、E2E 9.00 秒，退出码均为 0；浏览器 13 通过、2 个已有视觉脚手架显式跳过。
- 最新日志：`/tmp/wemail-m0-final-{lint,typecheck,test,build,e2e}.log`，命令退出码与耗时见 `/tmp/wemail-m0-final-results.json`。版本/API 目录/迁移编号/preflight 检查通过。
- DEV-03：6 个真实本地业务场景通过（3.6 秒浏览器执行，整个隔离环境约 9.5 秒）；收件截图与浏览器 console 检查已验证。供应商由测试入口适配器控制，不能代替真实 Email Routing/Resend/聊天平台验收。
- 加强迁移快照检查后发现历史默认值、nullable 与 expiry 索引列顺序漂移，已修正；完整四个 workspace 测试已通过复验。
- 2026-10-06 DEV-04 定向恢复与数据库测试 13/13；Worker 全套在新增恢复用例前 208/208。完整批次与业务 E2E 待本阶段收尾后验证。
- DEV-04/05 真实业务 E2E 已扩展到 7 项并通过，包含 UI 重放、规则解释、自动到期恢复与手机宽度检查；桌面/手机截图在 `/tmp/wemail-notification-status-{desktop,mobile}.png`，接口目录与 OpenAPI 已同步。
- 全量检查中修复了预检输出的兼容断言和新增规则标题导致的旧测试歧义；未移除原有行为断言。一次环境中 pnpm 11 的自动安装检查失败，已使用项目指定的 pnpm 10.18.2 重跑，未新增依赖。
- 2026-10-06 通知批次：四个 workspace 的 lint/typecheck/test/build 通过；shared 30、Worker 220、Web 339 个测试通过，Docs assert 测试通过；原浏览器 smoke 13 通过/2 个既有视觉脚手架跳过；真实业务 E2E 7/7。最后的计数与规则文案调整也通过定向和业务回归。

## 远端验证

- 草稿 PR：[WeOpen/WeMail #41](https://github.com/WeOpen/WeMail/pull/41)。阶段一至通知状态批次已提交并推送；未合并或发布 production。
- 验证 commit：`eb83e65d87010d6fc962037f17833874ee4d5f93`。
- [CI 37411974396](https://github.com/WeOpen/WeMail/actions/runs/37411974396)：verify 成功。
- [E2E 37411974386](https://github.com/WeOpen/WeMail/actions/runs/37411974386)：页面 smoke 与 business-playwright 两个 job 成功。
- [Preview Build 37411974371](https://github.com/WeOpen/WeMail/actions/runs/37411974371)：前端预览构建成功；文档 Vercel preview 状态也为成功。
- 2026-10-06 交接时下一项为 DEV-06；后续实现与验证见下方 2026-11-20 续接批次。


## 2026-11-20 续接批次

从原会话保留的 DEV-06 未提交工作继续，完成 DEV-06/07/08 本地实现。根 `HANDOFF.MD` 记录新的恢复、认证、文档和工具链踩坑。

- 单元/集成最新统计为 shared 42、Worker 247、Web 367，共 656 项；Docs assert 测试通过。Worker 最后增加早到事件关联事务故障注入后完整复跑通过。
- 四个 workspace 的 lint、typecheck、build 通过。文档依赖添加时本地 pnpm 11 store 与项目 pnpm 10 链接不一致，曾导致 Docs CLI 入口失效；已用项目指定 pnpm 10.18.2 frozen-lockfile 重建依赖，随后重跑全部检查。
- 浏览器 smoke 13 通过，2 个已有视觉脚手架显式跳过。真实本地业务 E2E 9/9，新增提前到达的签名回调、幂等键复用、最终时间线、首信收件/复制、应用内任务文档及管理员修复入口。
- ego lite 实际检查了发件页、收件详情、系统诊断和任务阅读页，375px 无页面横向溢出；修复了筛选标签竖排和终态显示下一次重试的误导。收件页显示原始认证头为未验证、规则提取及两个独立链接。
- 本地日志 `/tmp/wemail-verified-{lint,typecheck,build,test,worker-final,business,smoke}.log`；E2E 截图在 `apps/web/test-results/business/`。ego 截图 `/tmp/wemail-final-{outbound-mobile,diagnostics,inbox-auth}.png`。
- 发件恢复每批最多10任务、4并发，域名检查15秒总预算、最多24个外部请求、4并发且显式触发并限流。提取最多32项，AI prompt最多16k字符。指南正文各自懒加载，Markdown chunk约47.5 kB gzip且未进入入口modulepreload。线上P50/P95、D1行读写和真实AI费用仍需实际测量。
- 2026-11-20通过GitHub API确认 staging Environment 的 repository secrets和variables均为0；现配置中的staging D1/KV ID仍是部署时注入占位符。当前没有可用的隔离环境证据，真实Email Routing、Resend、聊天平台及Workers AI验收保持待完成。用户在本聊天确认目前尚无隔离staging资源和专用测试收件地址。
- 最后审查发现并修复D1早到事件关联的P1：发送完成与已缓存回调的状态合并必须同一batch，否则第二次写失败后可能永久停在accepted。触发器注入证明整个事务回滚保留lease，并能恢复到delivered且只扣一次额度。

本批实现 commit 为 `2d71c89fc0a27d776bd317ca65e0f9c038f640fc`，已推送草稿 PR #41。首次 E2E run `44691208256` 两个 job 均在安装 Chromium 时失败，因为 ubuntu-latest 已切到 Playwright 1.59.1 不支持的 Ubuntu 26.04。已将浏览器两个 job 固定到 Ubuntu 24.04，修复后的浏览器两套job均已通过，完整CI后续暴露的个人设置竞态见下一段。

远端复验 `35ba5cd` 的 [E2E 44691490265](https://github.com/WeOpen/WeMail/actions/runs/44691490265) 为9项业务、13项smoke通过及2项既有跳过，Preview/Vercel通过。[CI 44691490137](https://github.com/WeOpen/WeMail/actions/runs/44691490137) 的个人资料编辑保存测试出现姓名回退（Web357通过/1失败），已用受控Promise复现并修复后台刷新覆盖草稿、旧GET覆盖PATCH、并发保存竞态，原精确payload断言保留；修复后Web367/367通过。最终提交的CI状态以[PR检查](https://github.com/WeOpen/WeMail/pull/41/checks)为准。

本批最终实现共656项单元/集成回归（shared42、Worker247、Web367），Docs断言通过。个人设置修复新增9项确定时序回归，四workspace检查与9项本地业务E2E复验通过，最终远端结果链接集中在[PR #41](https://github.com/WeOpen/WeMail/pull/41)及其检查页。
