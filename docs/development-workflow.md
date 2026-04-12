# 开发协作流程

## 1. 开始前先看什么

至少先阅读以下文档：

1. `docs/code-standard.md`
2. `docs/architecture/layered-architecture.md`
3. `docs/testing-strategy.md`
4. 如涉及发布或配置，再看 `docs/deploy-runbook.md`

## 2. 分支规范

- `main`：稳定主线
- `feature/<topic>`：功能开发
- `fix/<topic>`：缺陷修复
- `refactor/<topic>`：重构与目录治理
- `docs/<topic>`：文档更新

不要直接在 `main` 上做长期开发。production 部署只能从 `main` 触发。

## 3. 开发流程

1. 明确需求、边界和影响范围。
2. 若涉及结构调整，先确认目录职责，必要时先补 README 或架构说明。
3. 若涉及重构，先锁定既有行为或补最小必要测试。
4. 小步修改，保持 diff 可审查。
5. 代码、流程、部署方式变更后，同步更新对应文档。
6. 提交前执行验证命令并记录结果。

## 4. 提交流程

提交信息遵循仓库 Lore Commit Protocol：

- 第一行写“为什么”
- 正文写约束、方案与取舍
- trailers 记录验证、风险与 rejected alternatives

最低验证要求：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

关键用户流、部署、配置或浏览器交互改动，需要按 `docs/testing-strategy.md` 补跑额外验证。

## 5. 评审清单

### 结构
- 目录职责是否清晰
- 新代码是否放在正确分层
- 是否出现反向依赖

### 代码质量
- 命名是否语义清晰
- 是否存在重复逻辑
- 是否引入了过早抽象
- 注释是否解释“为什么”而不是“做什么”

### 安全与边界
- session / API key / admin 权限边界是否清晰
- 外部输入是否经过 schema 或 validator 处理
- 错误响应是否明确

### 测试与验证
- 是否新增或更新必要测试
- 是否覆盖关键回归路径
- 验证命令是否真实执行

### 文档
- 目录 README 是否同步
- `docs/` 是否仍与实现一致

## 6. 文档联动规则

| 变更类型 | 至少同步更新 |
| --- | --- |
| 目录结构或分层边界变化 | 相关目录 README、`docs/code-standard.md`、`docs/architecture/layered-architecture.md` |
| 测试、CI、验证门槛变化 | `docs/testing-strategy.md` |
| 部署、secrets、Cloudflare 绑定、发布流程变化 | `docs/deploy-runbook.md` |
| 开发流程或协作规则变化 | `docs/development-workflow.md`、`CONTRIBUTING.md` |

## 7. 治理约束

- 文档、workflow、模板必须和真实流程一致，不能只写不执行。
- 自动化必须可解释、可回滚、可验证。
- 生产相关变更必须保留 staging 验证和回滚路径。
- 敏感信息不进入仓库，运行时 secrets 与 deploy secrets 分开管理。
- `.github/` 和 `docs/` 需要互相印证，避免长期失真。
