# 代码规范

本文档只保留新增和修改代码时必须遵守的约束。

开发流程看 `docs/development-workflow.md`，测试与验证看 `docs/testing-strategy.md`，架构边界看 `docs/architecture/layered-architecture.md`。

## 1. 总原则

- 可读性优先于炫技
- 一致性优先于个人偏好
- 分层边界优先于临时方便
- 组合优先于复制，复制优先于错误抽象
- 不为未来“也许会用”提前建抽象
- 文档和目录职责必须与真实代码同步

## 2. 命名

### 标识符
- 变量、函数使用 `camelCase`
- 类型、接口、枚举使用 `PascalCase`
- React 组件使用 `PascalCase`
- Hook 使用 `useXxx`
- 事件处理函数使用 `handleXxx`
- 布尔值优先使用 `is`、`has`、`can`、`should`

### 文件
- TypeScript / Worker / 通用逻辑文件使用 `kebab-case.ts`
- React 组件文件使用 `PascalCase.tsx`
- 测试文件使用 `*.test.ts` / `*.test.tsx`
- 关键目录统一使用 `README.md`

### 目录
- 目录统一使用 `kebab-case`
- 禁止使用 `misc`、`common2`、`temp`、`new`、`others` 这类无语义名称

## 3. 格式

- 编码统一使用 UTF-8
- 行尾统一使用 LF
- 缩进统一 2 spaces
- 字符串统一使用 double quotes
- 多行对象、数组、参数列表允许尾随逗号
- 行宽软限制约 100 字符，超出时优先换行

### Import 顺序
1. 第三方依赖
2. workspace 包（如 `@wemail/shared`）
3. 相对路径

## 4. 注释

- 注释解释“为什么”，不要重复“做什么”
- 代码能通过命名表达清楚时，不要补废话注释
- 只有在以下情况才建议加注释：
  - 平台限制
  - 安全敏感逻辑
  - 反直觉实现
  - 临时兼容逻辑

## 5. 前端边界

`apps/web/src/` 依赖方向：`app -> pages -> features -> shared`

- `app/`：入口、路由、全局装配
- `pages/`：页面级组合，不直接散落底层 fetch
- `features/`：单一业务主题
- `shared/`：通用 API、hooks、样式、UI、工具
- `test/`：测试工具与集成测试

约束：
- 页面不得依赖其他页面
- API 调用统一通过 `shared/api/`
- 不要在渲染路径里引入副作用
- 不要为简单场景引入重型状态管理

## 6. 后端边界

`apps/worker/src/` 依赖方向：`app -> core/infrastructure/shared`

- `app/`：路由注册、请求编排、响应映射
- `core/`：类型契约、绑定定义、上下文接口
- `infrastructure/`：D1、R2、外部服务接入
- `shared/`：通用安全、邮件解析、纯辅助逻辑

约束：
- 路由层只做参数接收、鉴权、调用流程、返回响应
- 不要在 handler 里堆复杂业务规则
- D1 / R2 / 第三方访问统一放 `infrastructure/`
- 安全相关逻辑必须集中，不要散落在业务代码中

## 7. shared 包边界

`packages/shared/` 只允许放：
- 共享类型
- 共享常量
- 纯函数
- 前后端都能安全使用的无副作用工具

不允许放：
- DOM 操作
- Cloudflare 运行时绑定访问
- 数据库存取逻辑
- 强运行时耦合代码

## 8. README 要求

关键目录的 `README.md` 需要写清楚：
- 目录职责
- 应该放什么
- 不应该放什么
- 与相邻层的边界

目录结构变化后，README 必须同步更新。

## 9. 禁止事项

- 一个文件承担多个层的职责
- 页面直接写数据库或存储逻辑
- 路由里堆积所有业务规则
- 复制粘贴同类 fetch、response、mapping 逻辑
- 用无语义目录名承载正式代码
- 把生成产物、缓存、临时日志提交进仓库
