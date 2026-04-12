# 0002 — Layered testing with e2e smoke coverage

## 背景

随着仓库结构变复杂，仅靠单元测试不足以证明关键业务流稳定。

## 决策

采用分层测试结构：

- unit tests for shared logic
- integration tests for worker and web
- Playwright e2e smoke tests for critical flows

## 备选方案

### 方案 A：只保留单元测试
- 优点：执行更快
- 缺点：对真实业务流的证明不足

### 方案 B：采用分层测试（最终选择）
- 优点：验证更完整，能覆盖关键用户路径
- 缺点：维护成本更高

## 结果与影响

- 测试更贴近真实用户路径
- CI 可以按层拆分执行
- 测试、发布与文档需要同步演进

## 后续动作

- 逐步补齐 invite、mailbox、inbox、outbound 等业务流的 e2e 覆盖
- 持续优化不稳定场景下的测试数据准备方式
