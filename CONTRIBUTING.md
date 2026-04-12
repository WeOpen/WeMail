# Contributing Guide

感谢参与 `wemail` 的开发。

## 开始前先阅读

- `docs/README.md`
- `docs/code-standard.md`
- `docs/development-workflow.md`
- `docs/testing-strategy.md`
- 如涉及部署或配置，再看 `docs/deploy-runbook.md`

## 基本要求

- 不要直接在 `main` 上做长期开发
- 先确认目录职责，再写代码
- 结构变更必须同步更新 README / docs
- 优先小步修改，保持 diff 可审查
- 不要把生成产物、缓存目录、临时日志提交进仓库

## 分支命名

- `feature/<topic>`
- `fix/<topic>`
- `refactor/<topic>`
- `docs/<topic>`

## 提交与验证

提交信息遵循 Lore Commit Protocol：

- 第一行写“为什么”
- 正文说明约束、方案、取舍
- trailers 记录验证、风险和 rejected alternatives

提交前至少运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

其他评审要求、文档联动规则、补充验证范围，以 `docs/development-workflow.md` 和 `docs/testing-strategy.md` 为准。

## Pull Request 要求

- 说明变更目的
- 说明影响范围
- 提供验证结果
- 说明剩余风险和后续工作
