# 📬 wemail

`wemail` 是一个基于 pnpm monorepo 的 disposable email 服务。

## 🏗️ 仓库结构

```text
apps/web/        # React 19 + Vite 前端
apps/worker/     # Cloudflare Worker + Hono 后端
packages/shared/ # 前后端共享类型、常量、纯函数
```

## 🛠️ 常用命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

### 按范围运行

```bash
pnpm test:worker
pnpm test:web
pnpm test:shared
pnpm test:worker:integration
pnpm test:web:integration
pnpm test:e2e
```

## 📚 文档入口

- `docs/README.md`：项目文档导航
- `docs/code-standard.md`：代码规范与分层边界
- `docs/development-workflow.md`：开发协作流程
- `docs/testing-strategy.md`：测试与验证策略
- `docs/deploy-runbook.md`：发布、部署与回滚手册

## 📝 什么内容适合放进 docs

- 稳定的项目级规范
- 需要跨目录共享的流程
- 发布与运维手册
- 已落地的架构决策

临时记录、调试日志、一次性草稿不要放进 `docs/`。
