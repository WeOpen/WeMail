export const tags = [
  { name: "仪表盘", description: "工作台总览数据。" },
  { name: "API 密钥", description: "个人 API Key 管理。" },
  { name: "Webhook", description: "事件端点和投递日志。" },
  { name: "Telegram", description: "Telegram 订阅。" },
  { name: "公告", description: "公告列表与发布。" },
  { name: "系统设置", description: "健康检查和功能开关。" }
];

export const paths = {
  "/api/dashboard": {
    get: {
      tags: ["仪表盘"],
      summary: "获取仪表盘总览",
      operationId: "getDashboard",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "仪表盘总览" } }
    }
  },
  "/api/api-keys": {
    get: {
      tags: ["API 密钥"],
      summary: "获取 API Key 列表",
      operationId: "listApiKeys",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "API Key 列表" } }
    },
    post: {
      tags: ["API 密钥"],
      summary: "创建 API Key",
      operationId: "createApiKey",
      security: [{ cookieAuth: [] }],
      responses: { 201: { description: "创建成功" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/api-keys/{id}": {
    delete: {
      tags: ["API 密钥"],
      summary: "吊销 API Key",
      operationId: "revokeApiKey",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { $ref: "#/components/responses/Ok" } }
    }
  },
  "/api/telegram/subscription": {
    get: {
      tags: ["Telegram"],
      summary: "获取 Telegram 订阅",
      operationId: "getTelegramSubscription",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "订阅状态" } }
    },
    put: {
      tags: ["Telegram"],
      summary: "更新 Telegram 订阅",
      operationId: "updateTelegramSubscription",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "订阅状态" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/telegram/overview": {
    get: {
      tags: ["Telegram"],
      summary: "获取 Telegram 能力总览",
      operationId: "getTelegramOverview",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "功能开关、Bot 配置、订阅状态和支持事件" } }
    }
  },
  "/api/telegram/test-message": {
    post: {
      tags: ["Telegram"],
      summary: "发送 Telegram 测试通知",
      operationId: "sendTelegramTestMessage",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: {
        200: { description: "测试通知投递结果" },
        409: { $ref: "#/components/responses/Error" },
        503: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/telegram/link-code": {
    post: {
      tags: ["Telegram"],
      summary: "生成 Telegram 一次性绑定码",
      operationId: "createTelegramLinkCode",
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: "一次性绑定码、/start 命令和可选 Telegram deep link" },
        403: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/telegram/webhook": {
    post: {
      tags: ["Telegram"],
      summary: "接收 Telegram Bot webhook 更新",
      operationId: "handleTelegramWebhook",
      parameters: [
        {
          name: "x-telegram-bot-api-secret-token",
          in: "header",
          required: false,
          schema: { type: "string" },
          description: "配置 TELEGRAM_WEBHOOK_SECRET 后需要匹配该请求头"
        }
      ],
      responses: {
        200: { description: "Webhook 处理结果，包含自动绑定成功或失败原因" },
        401: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/telegram/deliveries": {
    get: {
      tags: ["Telegram"],
      summary: "获取 Telegram 最近投递记录",
      operationId: "listTelegramDeliveries",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "最近 Telegram 投递记录" } }
    }
  },
  "/api/webhook/endpoints": {
    get: {
      tags: ["Webhook"],
      summary: "获取 Webhook 端点",
      operationId: "listWebhookEndpoints",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "端点列表" } }
    },
    post: {
      tags: ["Webhook"],
      summary: "创建 Webhook 端点",
      operationId: "createWebhookEndpoint",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 201: { description: "创建成功" } }
    }
  },
  "/api/webhook/deliveries": {
    get: {
      tags: ["Webhook"],
      summary: "获取 Webhook 投递日志",
      operationId: "listWebhookDeliveries",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "投递日志" } }
    }
  },
  "/api/announcements": {
    get: {
      tags: ["公告"],
      summary: "获取公告列表",
      operationId: "listAnnouncements",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
        { name: "pageSize", in: "query", schema: { type: "integer", enum: [3, 4, 5, 10, 20, 50] } },
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "type", in: "query", schema: { type: "string", enum: ["产品更新", "维护通知", "运营通知", "安全提醒"] } },
        { name: "status", in: "query", schema: { type: "string", enum: ["已发布", "进行中", "即将开始", "已结束", "已归档"] } },
        { name: "time", in: "query", schema: { type: "string", enum: ["7d", "30d"] } },
        { name: "scope", in: "query", schema: { type: "string", enum: ["manage"] } }
      ],
      responses: { 200: { description: "公告列表" } }
    },
    post: {
      tags: ["公告"],
      summary: "发布公告",
      operationId: "createAnnouncement",
      security: [{ cookieAuth: [] }],
      responses: { 201: { description: "发布成功" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/announcements/{id}": {
    get: {
      tags: ["公告"],
      summary: "获取公告详情",
      operationId: "getAnnouncement",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { $ref: "#/components/parameters/IdPath" },
        { name: "scope", in: "query", schema: { type: "string", enum: ["manage"] } }
      ],
      responses: { 200: { description: "公告详情" }, 404: { $ref: "#/components/responses/Error" } }
    },
    patch: {
      tags: ["公告"],
      summary: "修改公告",
      operationId: "updateAnnouncement",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { description: "修改成功" }, 403: { $ref: "#/components/responses/Error" } }
    },
    delete: {
      tags: ["公告"],
      summary: "删除公告",
      operationId: "deleteAnnouncement",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 204: { description: "删除成功" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/announcements/{id}/receipt": {
    post: {
      tags: ["公告"],
      summary: "签收公告",
      operationId: "acknowledgeAnnouncement",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { description: "签收成功" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/system/health": {
    get: {
      tags: ["系统设置"],
      summary: "获取服务健康状态",
      operationId: "getSystemHealth",
      responses: { 200: { description: "健康状态" } }
    }
  },
  "/api/system/features": {
    get: {
      tags: ["系统设置"],
      summary: "获取功能开关",
      operationId: "getSystemFeatures",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "功能开关" }, 403: { $ref: "#/components/responses/Error" } }
    },
    patch: {
      tags: ["系统设置"],
      summary: "更新功能开关",
      operationId: "updateSystemFeatures",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "功能开关" }, 403: { $ref: "#/components/responses/Error" } }
    }
  }
};
