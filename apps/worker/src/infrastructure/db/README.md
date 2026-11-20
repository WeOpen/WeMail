# 🗄️ infrastructure/db

数据库结构与迁移资源。

## ✅ 放什么
- schema
- migration
- 数据库初始化脚本

`schema.sql` 是新本地库的当前结构快照，必须与全部 migrations 执行后的列和索引保持一致。远端升级使用 migrations；新增迁移时同步快照，并验证空库初始化和旧库升级。

## 🚫 不放什么
- 业务流程逻辑
- 运行时请求处理
