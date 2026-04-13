# 🧷 core

核心契约层。

## ✅ 放什么
- 绑定类型
- 核心接口
- 跨层共享的契约定义
- Worker 配置解析入口（`config.ts`）

## 🚫 不放什么
- 数据库实现
- 外部集成代码
- 页面或测试专属逻辑

## ⚙️ 配置文件说明

### `bindings.ts`
- 定义 Worker 运行时 bindings 和契约类型
- 描述 `env` 里可能出现的 vars、secrets、绑定对象

### `config.ts`
- 把原始 `env` 字符串解析成类型化配置对象
- 统一处理布尔值、数值、CSV 列表和默认值
- 是 Worker 配置进入业务代码前的唯一收口点

## 📏 使用约定
- 路由、use-case、service 不要重复手写 `Number(...)`、`split(",")`、布尔值判断
- 需要配置时，优先从 `resolveAppConfig()` 读取
- 新增配置项时，同时更新：
  - `bindings.ts`
  - `config.ts`
  - `wrangler.toml`
  - `.env.example`
  - 相关 README 或 docs
