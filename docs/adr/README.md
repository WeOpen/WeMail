# ADR 目录

本目录用于存放已经落地、需要长期追溯的 Architecture Decision Record。

## 什么时候写 ADR

- 目录结构或分层边界发生正式变化
- 技术选型产生长期约束
- 测试、发布、部署策略发生关键调整
- 一个决策会影响后续维护者判断

## 不需要写 ADR 的情况

- 临时草稿
- 未定案的 brainstorming 记录
- 与实现细节完全重复的说明
- 只影响一次性任务的短期决策

## 命名规则

```text
0001-layered-architecture.md
0002-testing-and-e2e.md
```

## 推荐结构

1. 标题
2. 背景
3. 决策
4. 备选方案
5. 结果与影响
6. 后续动作

新建 ADR 时直接复制 `docs/adr-template.md`。
