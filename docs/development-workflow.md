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
6. 每次提交都更新根目录 `CHANGELOG.md` 的 `[Unreleased]` 或当前 release 段落。
7. 提交前执行验证命令并记录结果。

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

## 5. 版本与 Changelog

### Changelog 规则

- 根目录 `CHANGELOG.md` 是项目级变更记录，遵循 Keep a Changelog 1.1.0。
- 每次提交都必须修改根 `CHANGELOG.md`：
  - 普通开发提交写入 `[Unreleased]`。
  - 发版提交把 `[Unreleased]` 内容移动到 `## [x.y.z] - YYYY-MM-DD`。
  - 真正没有产品或项目行为变化的维护提交，也要记录一条简短维护说明，避免提交与变更记录脱节。
- 记录面向人理解的变化，不复制 commit log；分类只使用 `Added`、`Changed`、`Deprecated`、`Removed`、`Fixed`、`Security`。

### 统一版本方案

短期方案：

1. 根 `package.json` 的 `version` 是 WeMail 项目版本的唯一人工修改入口。
2. `apps/web/package.json`、`apps/worker/package.json`、`packages/shared/package.json` 的 `version` 与根版本保持一致。
3. 发布时只打 `vX.Y.Z` tag，tag 必须等于根 `package.json` 的版本。
4. UI、文档和 API 返回值不要硬编码版本号；需要展示版本时，从共享常量或构建期生成的版本元数据读取。
5. OpenAPI `info.version` 必须从根 `package.json` 版本生成，和项目版本保持一致。

已提供自动化：

1. `pnpm version:sync` 读取根 `package.json` 的 `version`，同步 workspace 包版本，生成 `packages/shared/src/version.ts`，并刷新 `docs/openapi.yaml`。
2. `pnpm version:check` 校验 workspace 包版本、shared 版本常量和 OpenAPI `info.version` 是否都等于根版本，并确认 `CHANGELOG.md` 有 `[Unreleased]` 与当前版本段落。
3. 前端 About 页从共享版本常量读取展示版本，OpenAPI 生成脚本从根 `package.json` 读取 `info.version`。
4. release workflow 在 tag 发布前应校验：
   - tag `vX.Y.Z` 等于根版本
   - workspace 包版本等于根版本
   - `CHANGELOG.md` 存在对应 `## [X.Y.Z] - YYYY-MM-DD`

版本选择遵循 SemVer：

- `major`：破坏 API、数据迁移或部署契约。
- `minor`：新增向后兼容功能。
- `patch`：缺陷修复、文档、样式、维护和小型改进。

## 6. 评审清单

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
- 根 `CHANGELOG.md` 是否已更新

## 7. 文档联动规则

| 变更类型 | 至少同步更新 |
| --- | --- |
| 目录结构或分层边界变化 | 相关目录 README、`docs/code-standard.md`、`docs/architecture/layered-architecture.md` |
| 测试、CI、验证门槛变化 | `docs/testing-strategy.md` |
| 部署、secrets、Cloudflare 绑定、发布流程变化 | `docs/deploy-runbook.md` |
| 开发流程或协作规则变化 | `docs/development-workflow.md`、`CONTRIBUTING.md` |
| 项目级用户可见、发布、流程或维护变化 | 根 `CHANGELOG.md` |

## 8. 治理约束

- 文档、workflow、模板必须和真实流程一致，不能只写不执行。
- 自动化必须可解释、可回滚、可验证。
- 生产相关变更必须保留 staging 验证和回滚路径。
- 敏感信息不进入仓库，运行时 secrets 与 deploy secrets 分开管理。
- `.github/` 和 `docs/` 需要互相印证，避免长期失真。
