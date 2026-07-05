export const tags = [{ name: "用户", description: "用户、邀请码、账号监管和外发配额。" }];

export const paths = {
  "/api/users": {
    get: {
      tags: ["用户"],
      summary: "获取用户列表，默认按创建时间倒序",
      operationId: "listUsers",
      security: [{ cookieAuth: [] }],
      parameters: [
        { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
        {
          name: "pageSize",
          in: "query",
          required: false,
          schema: { type: "integer", enum: [10, 20, 50], default: 10 }
        },
        { name: "search", in: "query", required: false, schema: { type: "string" } },
        { name: "role", in: "query", required: false, schema: { type: "string", enum: ["admin", "member"] } },
        { name: "status", in: "query", required: false, schema: { type: "string", enum: ["active", "disabled"] } }
      ],
      responses: {
        200: {
          description: "分页用户列表，默认最新创建的用户在前。",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["users", "total", "page", "pageSize"],
                properties: {
                  users: {
                    type: "array",
                    items: { type: "object" }
                  },
                  total: { type: "integer", minimum: 0 },
                  page: { type: "integer", minimum: 1 },
                  pageSize: { type: "integer", enum: [10, 20, 50] }
                }
              }
            }
          }
        },
        403: { $ref: "#/components/responses/Error" }
      }
    },
    post: {
      tags: ["用户"],
      summary: "新增用户",
      operationId: "createUser",
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "name", "password", "role"],
              properties: {
                email: { type: "string", format: "email" },
                name: { type: "string" },
                password: { type: "string", minLength: 8 },
                role: { type: "string", enum: ["admin", "member"] }
              }
            }
          }
        }
      },
      responses: { 201: { description: "创建成功" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/{userId}": {
    patch: {
      tags: ["用户"],
      summary: "更新用户资料",
      operationId: "updateUser",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "用户" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    },
    delete: {
      tags: ["用户"],
      summary: "删除用户",
      operationId: "deleteUser",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { $ref: "#/components/responses/Ok" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/{userId}/password": {
    patch: {
      tags: ["用户"],
      summary: "重置用户密码",
      operationId: "resetUserPassword",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "用户" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/{userId}/status": {
    patch: {
      tags: ["用户"],
      summary: "切换用户状态",
      operationId: "updateUserStatus",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "用户" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/commercial": {
    get: {
      tags: ["用户"],
      summary: "获取商业与团队模型",
      operationId: "getUsersCommercialModel",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "套餐层级、默认组织空间、团队用量、共享邮箱和组织审计摘要。" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/accounts": {
    get: {
      tags: ["用户"],
      summary: "获取全量账号列表",
      operationId: "listUserAccounts",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "全量账号列表" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/invites": {
    get: {
      tags: ["用户"],
      summary: "获取邀请码列表",
      operationId: "listUserInvites",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "邀请码列表" } }
    },
    post: {
      tags: ["用户"],
      summary: "创建邀请码",
      operationId: "createUserInvite",
      security: [{ cookieAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                count: { type: "integer", minimum: 1, maximum: 50, default: 1 },
                expiresInDays: { type: ["integer", "null"], minimum: 1, maximum: 365 },
                maxRedemptions: { type: "integer", minimum: 1, maximum: 100, default: 1 },
                targetRole: { type: "string", enum: ["admin", "member"], default: "member" }
              }
            },
            example: { count: 5, expiresInDays: 30, maxRedemptions: 3, targetRole: "member" }
          }
        }
      },
      responses: { 201: { description: "创建成功" } }
    }
  },
  "/api/users/invites/{id}": {
    delete: {
      tags: ["用户"],
      summary: "禁用邀请码",
      operationId: "disableUserInvite",
      security: [{ cookieAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { $ref: "#/components/responses/Ok" } }
    }
  },
  "/api/users/{userId}/quota": {
    get: {
      tags: ["用户"],
      summary: "获取用户外发配额",
      operationId: "getUserQuota",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "配额" } }
    },
    patch: {
      tags: ["用户"],
      summary: "更新用户外发配额",
      operationId: "updateUserQuota",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "配额" }, 400: { $ref: "#/components/responses/Error" } }
    }
  }
};
