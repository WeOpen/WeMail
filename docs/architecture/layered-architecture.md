# 分层架构说明

本文档只描述当前仓库的结构、目录职责和依赖方向。

编码约束见 `docs/code-standard.md`，开发协作见 `docs/development-workflow.md`。

## 1. 顶层结构

```text
apps/
  web/       # React + Vite 前端应用
  worker/    # Cloudflare Worker + Hono 后端应用
packages/
  shared/    # 前后端共享类型、常量、纯函数
docs/        # 项目级规范、流程、ADR
scripts/     # 仓库级脚本
```

## 2. 前端结构

```text
apps/web/src/
  app/       # 应用入口、路由、全局装配
  pages/     # 页面级组合
  features/  # 业务特性
  shared/    # 通用 API、hooks、样式、UI、工具
  test/      # 测试工具与集成测试
```

依赖方向：`app -> pages -> features -> shared`

说明：
- `app/` 负责启动和编排
- `pages/` 负责页面组装
- `features/` 承载业务能力
- `shared/` 提供无业务归属的复用能力
- `test/` 放测试相关代码

## 3. 后端结构

```text
apps/worker/src/
  app/              # 路由注册、请求流程、响应映射
  core/             # 类型契约、绑定定义、上下文接口
  infrastructure/   # D1、R2、外部服务集成
  shared/           # 通用安全、邮件解析、纯辅助逻辑
```

依赖方向：`app -> core/infrastructure/shared`

说明：
- `app/` 负责 HTTP 入口和流程编排
- `core/` 定义接口与核心契约
- `infrastructure/` 承载持久化和外部依赖接入
- `shared/` 提供通用复用逻辑

## 4. shared 包定位

```text
packages/shared/
```

职责：
- 共享类型
- 共享常量
- 纯函数
- 前后端都能安全复用的无副作用工具

不应承载：
- DOM 逻辑
- Cloudflare 运行时绑定访问
- 数据库存取逻辑
- 强运行时耦合实现

## 5. 文档与目录 README 的关系

- `docs/` 负责项目级规则、流程和架构决策
- 各关键目录下的 `README.md` 负责解释本目录职责和边界
- 当目录结构变化时，两者需要同步更新

## 6. 演进原则

- 先明确职责，再增加层次
- 能放在现有边界内，就不要新增新层
- 新增目录前，先确认它是否形成稳定职责
