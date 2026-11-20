# 🔍 integration

Worker 路由与业务协同集成测试目录。

## ✅ 放什么
- 路由级集成测试
- store / auth / runtime 协同测试
- 需要多个模块共同参与的回归测试

## 🚫 不放什么
- 纯函数单元测试
- 真实生产凭证

## 📍 当前状态

当前已有 `admin`、`mailbox`、`message`、`outbound`、`settings` 五组测试，覆盖路由权限、注册/邀请码前置、邮箱管理、邮件过滤/读取/批量操作、发件额度和设置/API Key 等业务协同。

`tests/helpers/test-env.ts` 创建 Hono app 和内存 store，通过 `app.request()` 调用生产路由；相关用例模拟外部 `fetch`。这些测试不启动真实 Worker、D1、Email Routing 或供应商服务，不能作为真实远端链路已验收的证据。

在仓库根目录运行：

```bash
pnpm test:worker:integration
```

连接隔离本地 D1 的业务验证和 staging 外部验收另见[测试策略](../../../../docs/testing-strategy.md)。新增测试驱动、迁移验证或真实环境验证后，同步此处的范围说明。
