export const tags = [{ name: "邮件", description: "收件、附件、发件、邮件设置。" }];

export const paths = {
  "/api/mail/messages": {
    get: {
      tags: ["邮件"],
      summary: "获取账号消息列表",
      description: "普通用户留空 accountId 时返回本人账号邮件；管理员留空时返回所有启用账号邮件，并包含未匹配到系统账号的入站邮件。",
      operationId: "listMailMessages",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { name: "accountId", in: "query", required: false, schema: { type: "string" }, description: "邮箱账号 ID，留空时普通用户返回本人账号邮件，管理员返回全局启用账号邮件和未匹配邮件。" },
        { name: "mailboxId", in: "query", required: false, schema: { type: "string" }, description: "accountId 的兼容别名。" },
        { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
        { name: "search", in: "query", required: false, schema: { type: "string" }, description: "按收件人、发件人、主题、正文预览或提取值搜索。" },
        {
          name: "filter",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["all", "code", "link", "attachment", "unparsed"], default: "all" }
        },
        { name: "from", in: "query", required: false, schema: { type: "string" }, description: "按发件人模糊筛选。" },
        { name: "subject", in: "query", required: false, schema: { type: "string" }, description: "按主题模糊筛选。" },
        { name: "startDate", in: "query", required: false, schema: { type: "string", format: "date-time" }, description: "按接收时间下限筛选。" },
        { name: "endDate", in: "query", required: false, schema: { type: "string", format: "date-time" }, description: "按接收时间上限筛选。" },
        { name: "hasAttachment", in: "query", required: false, schema: { type: "boolean" }, description: "是否只显示有/无附件邮件。" },
        {
          name: "extractionType",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["auth_code", "auth_link", "service_link", "subscription_link", "other_link", "none"] },
          description: "按识别结果类型筛选。"
        }
      ],
      responses: { 200: { description: "分页消息列表，包含 messages、total、page、pageSize 与 summary；message 可包含 toAddress。" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/messages/batch": {
    post: {
      tags: ["邮件"],
      summary: "批量处理消息",
      description: "对当前用户可见消息执行删除或导出。删除会同步清理附件元数据；导出返回消息摘要列表。",
      operationId: "batchMailMessages",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["action", "messageIds"],
              properties: {
                action: { type: "string", enum: ["delete", "export"] },
                messageIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 100 }
              }
            },
            example: { action: "delete", messageIds: ["msg_123", "msg_456"] }
          }
        }
      },
      responses: {
        200: { description: "批量动作结果，包含 action、requested、affected 和可选 messages。" },
        400: { $ref: "#/components/responses/Error" },
        401: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/mail/messages/{id}": {
    get: {
      tags: ["邮件"],
      summary: "获取消息详情",
      operationId: "getMailMessage",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { description: "消息详情" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/messages/{messageId}/attachments/{attachmentId}": {
    get: {
      tags: ["邮件"],
      summary: "获取消息附件",
      operationId: "getMailAttachment",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { name: "messageId", in: "path", required: true, schema: { type: "string" } },
        { name: "attachmentId", in: "path", required: true, schema: { type: "string" } },
        { name: "preview", in: "query", required: false, schema: { type: "string", enum: ["1"] }, description: "图片附件预览模式，安全图片会以内联方式返回。" }
      ],
      responses: { 200: { description: "附件元数据或文件流" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/messages/{messageId}/remote-image": {
    get: {
      tags: ["邮件"],
      summary: "代理加载远程邮件图片",
      operationId: "proxyMailRemoteImage",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { name: "messageId", in: "path", required: true, schema: { type: "string" } },
        { name: "url", in: "query", required: true, schema: { type: "string", format: "uri" }, description: "公开 HTTPS 图片 URL。SVG、HTML、超大图片和内网地址会被拒绝。" }
      ],
      responses: {
        200: { description: "代理后的安全图片响应。" },
        400: { $ref: "#/components/responses/Error" },
        413: { $ref: "#/components/responses/Error" },
        415: { $ref: "#/components/responses/Error" },
        502: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/mail/outbound": {
    get: {
      tags: ["邮件"],
      summary: "获取发件记录",
      operationId: "listMailOutbound",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        { name: "accountId", in: "query", required: true, schema: { type: "string" } },
        { name: "mailboxId", in: "query", required: false, schema: { type: "string" }, description: "accountId 的兼容别名。" },
        { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "pageSize", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 6 } },
        { name: "search", in: "query", required: false, schema: { type: "string" }, description: "按发件身份、收件人、主题、正文、错误或 payload 搜索。" },
        { name: "status", in: "query", required: false, schema: { type: "string", enum: ["all", "sent", "failed", "queued", "sending", "accepted", "delivered", "bounced", "complained", "uncertain"], default: "all" }, description: "sent 汇总历史提交/供应商受理/送达；failed 汇总失败/退信/投诉/结果未知。其他值精确筛选。" }
      ],
      responses: { 200: { description: "分页发件记录，包含 messages、total、page、pageSize 与 summary。" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/outbound/maturity": {
    get: {
      tags: ["邮件"],
      summary: "获取发信成熟度检查",
      operationId: "getMailOutboundMaturity",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: {
        200: {
          description: "当前用户发信额度、静态身份检查、配置来源 DNS checklist、重试策略、Return-Path 说明和模板入口；不发起供应商或 DNS 查询。"
        },
        401: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/mail/outbound/domain-status": {
    get: {
      tags: ["邮件"], summary: "检查实际发件域名", operationId: "checkMailOutboundDomain",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "独立查询 Resend 域名验证与公共 DNS，逐项返回 source、status、message 和 checkedAt。" }, 401: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/providers/resend/events": {
    post: {
      tags: ["邮件"], summary: "接收 Resend 投递事件", operationId: "receiveResendEvent",
      description: "校验原始请求体的 Svix 签名及五分钟时间窗口；按 svix-id 去重，缓冲早到事件，终态不会被较晚的受理事件降级。",
      security: [],
      parameters: ["svix-id", "svix-timestamp", "svix-signature"].map((name) => ({ name, in: "header", required: true, schema: { type: "string" } })),
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["type", "created_at", "data"], properties: { type: { type: "string" }, created_at: { type: "string", format: "date-time" }, data: { type: "object", properties: { email_id: { type: "string" } } } } } } } },
      responses: { 200: { description: "已保存、重复或忽略的供应商事件。" }, 400: { $ref: "#/components/responses/Error" }, 401: { $ref: "#/components/responses/Error" }, 413: { $ref: "#/components/responses/Error" }, 503: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/outbound/{id}": {
    get: {
      tags: ["邮件"],
      summary: "获取发件记录详情",
      operationId: "getMailOutbound",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { description: "发件记录详情，包含正文、请求 payload、provider 响应、provider message id、attempts、nextAttemptAt 与持久化 timeline；旧 sent 只证明历史提交。" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/send": {
    post: {
      tags: ["邮件"],
      summary: "发送邮件",
      operationId: "sendMail",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      description: "每个用户的 requestId 唯一；同键相同内容返回已有逻辑请求，不重复扣额。同键不同内容返回 409。配额按已接受的逻辑请求计数，自动重试不再次扣额。HTTP 200 仅证明供应商受理，送达需事件确认。",
      parameters: [{ name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", maxLength: 256 }, description: "优先于 JSON requestId；网络重试必须复用，修改正文或主动补发须换新键。" }],
      requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["mailboxId", "toAddress", "subject", "bodyText"], properties: { mailboxId: { type: "string" }, toAddress: { type: "string", format: "email" }, subject: { type: "string" }, bodyText: { type: "string" }, requestId: { type: "string", maxLength: 256 } } } } } },
      responses: { 200: { description: "供应商已受理，或重放已完成的逻辑请求；返回 message 与 quota。" }, 202: { description: "请求已持久化，等待重试或结果待确认；查看 message.status。" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" }, 409: { $ref: "#/components/responses/Error" }, 502: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/settings": {
    get: {
      tags: ["邮件"],
      summary: "获取邮件设置",
      operationId: "getMailSettings",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "邮件设置" } }
    },
    put: {
      tags: ["邮件"],
      summary: "更新邮件设置",
      operationId: "updateMailSettings",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "邮件设置" }, 403: { $ref: "#/components/responses/Error" } }
    }
  }
};
