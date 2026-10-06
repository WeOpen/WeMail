# 真实本地业务回归

运行 `pnpm test:e2e:business`，无需手动启动服务。测试实际连接生产路由、D1 本地数据库、R2 本地附件存储与浏览器页面，没有 `page.route()` API 替身。外部供应商使用 Worker 测试入口里的受控适配器。

`BUSINESS_TEST_TOKEN` 由 runner 临时生成；邀请码、用户、邮箱和消息都在隔离数据库中。测试结束时删除临时配置与存储，日志/失败截图/trace 保存在已忽略的 `apps/web/test-results/business` 中。

Browser 插件与其 browser skill 未在当前会话中提供，本批次按前端测试技能使用项目既有 Playwright。验证目标为“真实邀请码注册 → 建邮箱 → 收件与多值提取 → API Key 与权限”，同时断言无页面运行时异常并保存收件页截图。
