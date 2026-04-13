# 🧱 apps/worker/src

后端源码根目录。

## 📦 放什么
- `app/`、`core/`、`infrastructure/`、`shared/` 分层源码

## 🚫 不放什么
- 测试数据文件以外的临时实验代码
- 构建输出

## 🗂️ 目录分层
- `app/`：路由注册、请求编排、响应映射
- `core/`：类型契约、绑定定义、上下文接口、配置解析
- `infrastructure/`：D1、R2、外部服务接入
- `shared/`：通用安全、邮件解析、纯辅助逻辑

## 🔄 本地开发建议
- 新增 HTTP 入口逻辑优先从 `app/` 进入
- 共享契约定义和配置解析优先放 `core/`
- 存储和第三方接入统一放 `infrastructure/`
- 可复用纯逻辑放 `shared/`
- 配置读取优先走 `core/config.ts`，不要在业务代码里散落解析逻辑

## 🔗 相关 README
- `app/README.md`
- `core/README.md`
- `infrastructure/README.md`
- `shared/README.md`
