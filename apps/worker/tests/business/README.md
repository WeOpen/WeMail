# 本地业务 E2E Worker

本目录提供独立的本地测试入口：真实生产 HTTP 路由、入站处理与 D1/R2 本地绑定参与测试，外部邮件/聊天供应商由受控适配器代替。

`scripts/run-business-e2e.mjs` 创建临时配置、随机驱动 token 与独立存储目录，绑定 127.0.0.1；测试结束后关闭进程并删除该临时目录。入口中的 `/__test/*` 只存在于测试 bundle，所有驱动请求都验证本地环境与 token。生产 `src/index.ts` 和 API 不增加测试入口。

测试替身不代表真实 Email Routing、Resend 或聊天平台验收。staging 外部链路另按验收清单记录。
