export const tags = [{ name: "用户", description: "用户、邀请码、账号监管和外发配额。" }];

export const paths = {
  "/api/users": {
    get: {
      tags: ["用户"],
      summary: "获取用户列表",
      operationId: "listUsers",
      security: [{ cookieAuth: [] }],
      responses: { 200: { description: "用户列表" }, 403: { $ref: "#/components/responses/Error" } }
    },
    post: {
      tags: ["用户"],
      summary: "新增用户",
      operationId: "createUser",
      security: [{ cookieAuth: [] }],
      responses: { 201: { description: "创建成功" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/users/{userId}": {
    patch: {
      tags: ["用户"],
      summary: "更新用户角色",
      operationId: "updateUserRole",
      security: [{ cookieAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: { 200: { description: "用户" }, 400: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" } }
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
