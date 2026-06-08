# modules

管理后台菜单域模块。

## 放什么
- `/api/*` 路由注册函数
- 菜单域私有的请求/响应拼装
- 菜单域旁路 OpenAPI 片段

## 不放什么
- D1 / R2 底层实现
- 跨菜单共享的鉴权、审计、配置服务
- Cloudflare runtime 入口

共享横切能力继续放在 `src/app/services`、`src/shared` 或 `src/infrastructure`。
