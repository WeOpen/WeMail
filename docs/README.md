# 文档总览

本目录只保留长期有效、跨目录共享、会影响协作判断的项目文档。

## 建议阅读顺序

1. `code-standard.md`：统一代码规范、分层边界、命名与目录要求
2. `development-workflow.md`：开发流程、评审重点、文档联动规则
3. `testing-strategy.md`：测试分层、CI 分工、验证门槛
4. `deploy-runbook.md`：发布、部署、secrets、回滚与事故处理
5. `architecture/layered-architecture.md`：当前架构与依赖方向说明
6. `adr-template.md` / `adr/`：正式架构决策记录模板与历史决策

## 文档分组

### 规范与架构
- `code-standard.md`
- `architecture/layered-architecture.md`
- `adr-template.md`
- `adr/`

### 开发与质量
- `development-workflow.md`
- `testing-strategy.md`

### 发布与运维
- `deploy-runbook.md`

## 放什么
- 稳定的项目级规范
- 需要跨目录共享的流程和约束
- 发布与运维的长期手册
- 已落地且需要追溯的架构决策

## 不放什么
- 临时会议纪要
- 一次性调试日志
- 构建产物截图
- 和目录 README 重复的实现细节
- 彼此只差少量清单的拆碎文档

## 维护要求
- 改代码结构时同步更新目录 README 与相关 docs
- 改 workflow / deploy / secrets / 发布流程时同步更新对应总文档
- 文档统一使用 UTF-8、LF，并保持标题、术语、目录名与仓库一致
