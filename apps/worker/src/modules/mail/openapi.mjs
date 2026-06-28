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
        { name: "attachmentId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "附件元数据或文件流" }, 404: { $ref: "#/components/responses/Error" } }
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
        { name: "status", in: "query", required: false, schema: { type: "string", enum: ["all", "sent", "failed"], default: "all" } }
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
          description: "当前用户发信额度、身份检查、DNS checklist、重试策略、Return-Path 说明和模板入口。"
        },
        401: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/mail/outbound/{id}": {
    get: {
      tags: ["邮件"],
      summary: "获取发件记录详情",
      operationId: "getMailOutbound",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { description: "发件记录详情，包含正文、请求 payload、provider 响应和 provider message id。" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/mail/send": {
    post: {
      tags: ["邮件"],
      summary: "发送邮件",
      operationId: "sendMail",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "发送成功并返回配额" }, 403: { $ref: "#/components/responses/Error" } }
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
