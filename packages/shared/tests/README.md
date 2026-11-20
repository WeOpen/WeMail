# 🧪 tests

共享纯逻辑测试目录。

## ✅ 放什么
- 纯函数测试
- 常量 / 规则测试
- `extraction-corpus.ts`：60 封手工标注的合成邮件；无真实邮箱、密钥或个人信息
- `extraction-quality.test.ts`：按 type + value 精确匹配统计 precision / recall，并固定有效期回归

## 🚫 不放什么
- 依赖具体运行时的集成测试
