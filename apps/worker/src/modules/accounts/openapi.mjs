export const tags = [{ name: "账号", description: "邮箱账号列表、创建、删除和账号策略。" }];

export const paths = {
  "/api/accounts": {
    get: {
      tags: ["账号"],
      summary: "获取当前用户账号列表",
      description: "不传分页参数时返回当前用户全部账号；传入 page、pageSize 或 search 时返回分页结果，供邮箱选择弹窗使用。管理员分页查询返回所有用户的启用账号，并带创建人字段。",
      operationId: "listAccounts",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1 },
          description: "分页页码；传入后响应包含 total、page、pageSize。"
        },
        {
          name: "pageSize",
          in: "query",
          required: false,
          schema: { type: "integer", minimum: 1, maximum: 50 },
          description: "每页账号数，默认 10，最大 50。"
        },
        {
          name: "search",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "按账号标签或邮箱地址搜索。"
        }
      ],
      responses: {
        200: {
          description: "账号列表；分页查询时额外返回 total、page、pageSize。",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["mailboxes"],
                properties: {
                  mailboxes: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "address", "label", "createdAt"],
                      properties: {
                        id: { type: "string" },
                        address: { type: "string", format: "email" },
                        label: { type: "string" },
                        createdBy: { type: ["string", "null"], description: "仅管理员分页查询返回。" },
                        createdByName: { type: ["string", "null"], description: "仅管理员分页查询返回。" },
                        createdAt: { type: "string", format: "date-time" }
                      }
                    }
                  },
                  total: { type: "integer", minimum: 0 },
                  page: { type: "integer", minimum: 1 },
                  pageSize: { type: "integer", minimum: 1 }
                }
              }
            }
          }
        },
        401: { $ref: "#/components/responses/Error" }
      }
    },
    post: {
      tags: ["账号"],
      summary: "创建账号",
      operationId: "createAccount",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      requestBody: { $ref: "#/components/requestBodies/AccountCreateRequest" },
      responses: { 201: { description: "创建成功" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/accounts/{id}": {
    delete: {
      tags: ["账号"],
      summary: "软删除账号",
      operationId: "deleteAccount",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { $ref: "#/components/responses/Ok" }, 404: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/accounts/bulk-delete": {
    post: {
      tags: ["账号"],
      summary: "批量软删除或彻底删除账号",
      operationId: "bulkDeleteAccounts",
      security: [{ cookieAuth: [] }],
      requestBody: { $ref: "#/components/requestBodies/AccountBulkDeleteRequest" },
      responses: {
        200: { description: "批量删除结果" },
        400: { $ref: "#/components/responses/Error" },
        403: { $ref: "#/components/responses/Error" },
        409: { $ref: "#/components/responses/Error" }
      }
    }
  },
  "/api/accounts/domains": {
    get: {
      tags: ["账号"],
      summary: "获取当前用户可用账号域名",
      operationId: "listAccountDomains",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "可用账号域名" }, 401: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/accounts/settings": {
    get: {
      tags: ["账号"],
      summary: "获取账号策略",
      operationId: "getAccountSettings",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "账号策略" } }
    },
    put: {
      tags: ["账号"],
      summary: "更新账号策略",
      operationId: "updateAccountSettings",
      security: [{ cookieAuth: [] }],
      requestBody: { $ref: "#/components/requestBodies/AccountSettingsUpdateRequest" },
      responses: {
        200: { description: "账号策略" },
        400: { $ref: "#/components/responses/Error" },
        403: { $ref: "#/components/responses/Error" }
      }
    }
  }
};
