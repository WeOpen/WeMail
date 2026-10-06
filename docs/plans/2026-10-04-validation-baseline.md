# WeMail 验证基线

记录日期：2026-10-04（Asia/Shanghai）  
关联计划：[下一步开发计划 DEV-02](2026-10-03-next-development-roadmap.md#dev-02-基线与文档一致性2–3-日)

## 首次完整基线

实际执行时间：2026-10-04 21:00:48–21:01:36（Asia/Shanghai）。命令按下表顺序串行运行；某条命令失败后继续运行下一条命令，以完整登记 lint、类型、测试、构建和现有 E2E 的状态。

执行环境：macOS 27.0.1 / arm64，Node.js `v24.19.0`，pnpm `10.18.2`，Wrangler `4.105.0`。根项目版本 `0.4.0`，执行起点 HEAD 为 `9915e2759fcd42b25473dadcbb83c65a5b2fcf13`。起点工作区已包含 `CHANGELOG.md`、`docs/README.md` 的未提交修改，以及未跟踪的下一步开发计划；本报告不是干净 checkout 的 CI 结果。

| 命令 | 结果 | 退出码 | 墙钟耗时 | 实际覆盖范围与数量 |
| --- | --- | ---: | ---: | --- |
| `pnpm lint` | 通过 | 0 | 5.89 秒 | shared、worker、web、docs 四个 workspace |
| `pnpm typecheck` | 通过 | 0 | 8.34 秒 | shared、worker、web、docs 四个 workspace；包含 docs 的 MDX 和 Next 路由类型生成 |
| `pnpm test` | 失败 | 1 | 13.61 秒 | shared 30/30，worker 169/169，web 332/333；合计 531 通过、1 失败，88 个文件通过、1 个文件失败；docs 因前一个 workspace 失败未执行 |
| `pnpm build` | 通过 | 0 | 10.66 秒 | shared TypeScript 产物、Worker dry-run、Web Vite 产物、Docs Next 产物 |
| `pnpm test:e2e` | 通过，含显式跳过 | 0 | 9.85 秒 | 共 15 项：13 通过、2 跳过；使用现有 Chromium 与本地 Vite preview |

完整基线命令总耗时为 **48.35 秒**。耗时是这一次本地执行的墙钟观察值，不代表 CI 时长或性能门槛。构建仅验证本地产物与 Worker dry-run，未部署远端资源。

## 已发现的阻断项

### BASE-01：邀请码弹窗关闭后，可访问性状态尚未恢复

- 状态：首次基线中失败；修复与复验结果必须另行登记。
- 失败用例：`apps/web/src/test/users-global-settings-page.test.tsx` → `UsersGlobalSettingsPage > keeps the invite and quota controls wired to callbacks`。
- 失败断言位置：首次运行时第 412 行，在创建邀请码弹窗消失后立即查找 `停用邀请码 ALPHA-2026` 按钮。
- 实际报错：`Unable to find an accessible element with the role "button" and name "停用邀请码 ALPHA-2026"`。
- 失败时 DOM：页面根容器仍有 `aria-hidden="true"` 与 `data-wemail-inert-count="1"`，`body` 仍有 `overflow: hidden`。因此按钮不可通过可访问角色查询取得；日志本身不能证明邀请码数据缺失。
- 下一步：核对弹窗退出动画与 inert 清理时机，验证弹窗关闭后底层页面恢复交互；修复应保持模态期间的可访问性隔离。
- 放行条件：该用例及必要的 overlay 回归通过，随后根 `pnpm test` 实际通过全部 workspace。

根 `scripts/run-task.mjs` 对每个 workspace 顺序执行并在失败时立即退出。为补齐这次基线的覆盖空档，2026-10-04 21:01:50 单独执行了 `pnpm test:docs`：退出码 0，墙钟耗时 **0.34 秒**。它运行 `apps/docs/tests/home-layout.test.mjs` 中的 Node assert 检查，未输出框架测试数量；不能将其计入上述 531 个 Vitest 通过用例，也不能据此将首次 `pnpm test` 改记为通过。

## E2E 覆盖与验证边界

现有 `apps/web/playwright.config.ts` 会启动 `http://127.0.0.1:4173` 的 Vite preview。此次构建成功后运行了现有 `smoke.spec.ts` 与 `design-system.spec.ts`；无需安装新的浏览器或依赖。

13 项通过覆盖首页、登录跳转与 return target、认证页切换、认证后的页面壳层、旧路由重定向、邮件/账号/用户设置、管理员看板、公告及公开设计系统结构。认证与业务数据大量使用 `page.route()` 模拟 API，此次结果证明前端对应路径可以渲染与交互，未证明真实 Worker、D1、Email Routing、Resend 或聊天平台联调成功。

2 项跳过为设计系统浅色/深色截图基线，受 `PW_UPDATE_DESIGN_SYSTEM_SNAPSHOTS=1` 显式开关控制。这次未打开开关、未生成或更新截图基线，不能宣称视觉回归已经验收。

E2E 日志存在 `NO_COLOR` 与 `FORCE_COLOR` 同时设置的 Node 警告；命令正常完成，未登记为阻断项。

## 日志与复现

首次运行完整输出保存在当前机器的以下临时文件。`/tmp` 不是持久化仓库证据；后续 CI 运行应上传对应日志与 Playwright 产物。

| 输出 | 本机位置 |
| --- | --- |
| 命令时间、退出码与环境 JSON | `/tmp/wemail-baseline-2026-10-04-results.json` |
| lint | `/tmp/wemail-baseline-2026-10-04-lint.log` |
| typecheck | `/tmp/wemail-baseline-2026-10-04-typecheck.log` |
| test | `/tmp/wemail-baseline-2026-10-04-test.log` |
| build | `/tmp/wemail-baseline-2026-10-04-build.log` |
| 现有 E2E | `/tmp/wemail-baseline-2026-10-04-test-e2e.log` |
| 补充 docs 测试 | `/tmp/wemail-baseline-2026-10-04-test-docs.log` |

在仓库根目录、已安装锁文件对应依赖的环境下，按顺序执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

如缺少 Chromium，先执行仓库已有的 `pnpm test:e2e:install`。本次未发生此环境缺口。

## 后续复验记录

2026-10-05 03:11 起完成修复后的整批复验，五条命令退出码均为 0：lint 4.56 秒、typecheck 6.10 秒、test 10.11 秒、build 8.63 秒、现有 E2E 9.00 秒（13 通过、2 个视觉脚手架显式跳过）。同时通过版本、接口目录、25 个迁移编号与部署 preflight 检查。

BASE-01 已修复：overlay 可访问性清理改为 layout effect，使弹窗移除与恢复底层访问发生在同一 commit，原有邀请码断言不变。额外发现 API Key 复制反馈计时器在页面卸载后触发，已改为生命周期内清理并补充两个回归用例。最新命令退出码与耗时记录在 `/tmp/wemail-m0-final-results.json`；仍不替代 CI 或真实外部链路验收。

修复完成后在本节追加命令、时间、退出码与实际覆盖数量，保留首次失败结果。阶段放行还需按开发计划执行版本一致性、API 目录、迁移编号、preflight 与相关新业务 E2E；本报告的基础五条命令不替代这些门槛。
