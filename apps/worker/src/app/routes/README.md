# routes

旧应用层路由目录。

管理后台 HTTP 注册函数已迁移到 `src/modules/*/routes.ts`，按左侧菜单域组织。
这里暂时只保留被模块复用的 DTO/request 解析代码，避免一次重构同时改动所有请求校验边界。

## 放什么
- 可被菜单模块复用的 DTO
- 可被菜单模块复用的 request parser

## 不放什么
- 新 HTTP route 注册函数
- 底层数据库实现
- 通用安全工具
