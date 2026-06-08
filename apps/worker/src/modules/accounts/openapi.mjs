export const tags = [{ name: "账号", description: "邮箱账号列表、创建、删除和账号策略。" }];

export const paths = {
  "/api/accounts": {
    get: {
      tags: ["账号"],
      summary: "获取当前用户账号列表",
      operationId: "listAccounts",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { description: "账号列表" }, 401: { $ref: "#/components/responses/Error" } }
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
      summary: "删除账号",
      operationId: "deleteAccount",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [{ $ref: "#/components/parameters/IdPath" }],
      responses: { 200: { $ref: "#/components/responses/Ok" }, 404: { $ref: "#/components/responses/Error" } }
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
      responses: { 200: { description: "账号策略" }, 403: { $ref: "#/components/responses/Error" } }
    }
  }
};
