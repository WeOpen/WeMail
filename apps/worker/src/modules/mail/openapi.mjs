export const tags = [{ name: "邮件", description: "收件、附件、发件、邮件设置。" }];

export const paths = {
  "/api/mail/messages": {
    get: {
      tags: ["邮件"],
      summary: "获取账号消息列表",
      operationId: "listMailMessages",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ name: "accountId", in: "query", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "消息列表" }, 404: { $ref: "#/components/responses/Error" } }
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
      parameters: [{ name: "accountId", in: "query", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "发件记录" } }
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
