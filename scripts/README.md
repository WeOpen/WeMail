# 🧰 scripts

仓库级脚本目录。

## ✅ 放什么
- lint / test / build 编排脚本
- 开发辅助脚本
- 版本同步与发布前检查脚本
- `run-business-e2e.mjs`：生命周期内启动隔离 Worker/D1/R2 与 Web preview，运行真实本地业务 Playwright 回归，退出时清理临时资源

## 🚫 不放什么
- 只服务某个业务模块的实现代码
- 一次性人工脚本
