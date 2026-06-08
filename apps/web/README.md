# 🌐 apps/web

前端应用目录（React + Vite）。

## 📦 目录职责

这里存放 Web 前端运行时配置、页面源码、前端测试和 E2E 相关配置。

## ✅ 放什么
- 前端源码
- 前端测试
- Vite / Playwright 配置
- 与 Web 应用直接绑定的静态入口

## 🚫 不放什么
- 后端逻辑
- Cloudflare Worker 绑定定义
- 共享纯函数与共享契约（应放 `packages/shared`）

## 🧭 本地开发流程

### 1. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

### 2. 启动本地开发服务

在仓库根目录执行：

```bash
pnpm dev
```

这会同时启动：

- 前端 Vite 开发服务器：`http://127.0.0.1:5173`
- Worker 本地服务：`http://127.0.0.1:8787`

如果只需要启动前端，可以在仓库根目录执行：

```bash
pnpm dev:web
```

也可以在前端目录单独执行：

```bash
pnpm --dir apps/web run dev
```

说明：
- 本地开发时，前端默认把 API 请求发到 `http://127.0.0.1:8787`
- 也可以通过 `VITE_API_BASE_URL` 覆盖 API 基址
- 因此完整本地流程建议使用 `pnpm dev` 同时启动前后端
- 若只启动前端不启动 Worker，注册、登录、邮箱等接口会失败

### 3. 启动 Worker 本地服务

```bash
pnpm dev:worker
```

常见本地地址为 `http://127.0.0.1:8787`。

### 4. 运行前端验证

在仓库根目录执行：

```bash
pnpm test:web
pnpm test:web:integration
pnpm lint
pnpm typecheck
pnpm build
```

### 5. 运行 E2E

首次安装 Playwright 浏览器：

```bash
pnpm test:e2e:install
```

执行 E2E：

```bash
pnpm test:e2e
```

说明：Playwright 配置会用 `pnpm exec vite preview --host 127.0.0.1 --port 4173` 启动预览服务。

## 🚀 部署流程

### Preview 部署

PR 提交后，`.github/workflows/deploy-preview.yml` 会：

1. 安装依赖
2. 执行 `pnpm build`
3. 上传 `apps/web/dist`
4. 若 Cloudflare secrets 已配置，则部署 Pages preview

### 正式部署

正式部署由 `.github/workflows/deploy-cloudflare.yml` 统一执行：

- `staging`：部署 Pages preview 分支 `staging`
- `production`：部署 Pages 正式环境

前端发布前，至少确保：

```bash
pnpm test:web
pnpm test:web:integration
pnpm build
```

详细发布步骤见 `docs/deploy-runbook.md`。

## 🔗 相关文档

- `apps/web/src/README.md`
- `docs/code-standard.md`
- `docs/testing-strategy.md`
- `docs/deploy-runbook.md`
