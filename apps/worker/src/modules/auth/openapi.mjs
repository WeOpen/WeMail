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
  "/api/auth/oauth/{provider}/start": {
    get: {
      tags: ["认证"],
      summary: "发起第三方快捷登录",
      operationId: "startOAuthLogin",
      parameters: [
        { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["github", "linuxdo"] } },
        { name: "next", in: "query", required: false, schema: { type: "string" } }
      ],
      responses: { 302: { description: "Redirect to OAuth provider" }, 503: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/auth/oauth/{provider}/callback": {
    get: {
      tags: ["认证"],
      summary: "处理第三方登录回调",
      operationId: "handleOAuthCallback",
      parameters: [
        { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["github", "linuxdo"] } },
        { name: "code", in: "query", required: true, schema: { type: "string" } },
        { name: "state", in: "query", required: true, schema: { type: "string" } }
      ],
      responses: { 302: { description: "Redirect to app or invite finalization" }, 400: { $ref: "#/components/responses/Error" } }
    }
  },
  "/api/auth/oauth/{provider}/finalize": {
    post: {
      tags: ["认证"],
      summary: "使用邀请码完成第三方新用户登录",
      operationId: "finalizeOAuthLogin",
      parameters: [
        { name: "provider", in: "path", required: true, schema: { type: "string", enum: ["github", "linuxdo"] } }
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["ticket", "inviteCode"],
              properties: {
                ticket: { type: "string" },
                inviteCode: { type: "string" }
              }
            }
          }
        }
      },
      responses: { 200: { $ref: "#/components/responses/SessionResponse" }, 403: { $ref: "#/components/responses/Error" } }
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
