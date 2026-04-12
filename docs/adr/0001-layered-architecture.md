# 0001 — Layered monorepo architecture

## 背景

仓库早期结构较扁平，前后端逻辑容易在单文件中膨胀，目录职责也不够明确。

## 决策

采用分层 monorepo 结构：

- `apps/web`
- `apps/worker`
- `packages/shared`
- `docs`

并在前后端内部继续采用清晰的分层目录边界。

## 备选方案

### 方案 A：继续使用扁平结构
- 优点：初期修改更快
- 缺点：后期维护成本高，职责容易混乱

### 方案 B：采用分层结构（最终选择）
- 优点：职责清晰，适合长期演进
- 缺点：初期目录治理和文档维护成本更高

## 结果与影响

- 代码边界更清晰
- README 与项目文档需要持续同步维护
- 更适合引入测试、CI 和仓库治理约束

## 后续动作

- 继续把业务逻辑从 routes / pages 下沉到合适的 feature、use case 或 service 层
- 持续保持目录 README 与 `docs/` 同步
