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
