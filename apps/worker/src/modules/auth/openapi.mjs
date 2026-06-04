export const tags = [{ name: "认证", description: "注册、登录、退出和当前会话。" }];

export const paths = {
  "/api/auth/register": {
    post: {
      tags: ["认证"],
      summary: "使用邀请码注册账号",
      operationId: "registerUser",
      requestBody: { $ref: "#/components/requestBodies/RegisterRequest" },
      responses: { 201: { $ref: "#/components/responses/SessionResponse" } }
    }
  },
  "/api/auth/login": {
    post: {
      tags: ["认证"],
      summary: "登录账号",
      operationId: "loginUser",
      requestBody: { $ref: "#/components/requestBodies/LoginRequest" },
      responses: { 200: { $ref: "#/components/responses/SessionResponse" } }
    }
  },
  "/api/auth/logout": {
    post: {
      tags: ["认证"],
      summary: "退出登录",
      operationId: "logoutUser",
      responses: { 200: { $ref: "#/components/responses/Ok" } }
    }
  },
  "/api/auth/session": {
    get: {
      tags: ["认证"],
      summary: "获取当前登录态",
      operationId: "getCurrentSession",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { 200: { $ref: "#/components/responses/SessionResponse" }, 401: { $ref: "#/components/responses/Error" } }
    }
  }
};
