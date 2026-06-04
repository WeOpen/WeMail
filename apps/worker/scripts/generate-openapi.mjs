import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as accounts from "../src/modules/accounts/openapi.mjs";
import * as auth from "../src/modules/auth/openapi.mjs";
import * as integrations from "../src/modules/integration-openapi.mjs";
import * as mail from "../src/modules/mail/openapi.mjs";
import * as users from "../src/modules/users/openapi.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../../..");

const modules = [auth, integrations, accounts, mail, users];

const spec = {
  openapi: "3.1.0",
  info: {
    title: "WeMail 菜单化后端 API",
    version: "2.0.0",
    description:
      "WeMail 后端 API 已按管理后台左侧菜单分组。旧 /auth、/admin、/api/mailboxes、/api/messages、/api/outbound、/api/keys、/api/telegram 路径不再保留。"
  },
  servers: [{ url: "/", description: "当前 Worker 服务根路径" }],
  tags: modules.flatMap((module) => module.tags),
  paths: Object.assign({}, ...modules.map((module) => module.paths)),
  components: {
    securitySchemes: {
      cookieAuth: { type: "apiKey", in: "cookie", name: "wemail_session" },
      bearerAuth: { type: "http", scheme: "bearer" }
    },
    parameters: {
      IdPath: { name: "id", in: "path", required: true, schema: { type: "string" } }
    },
    requestBodies: {
      RegisterRequest: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password", "inviteCode"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" },
                inviteCode: { type: "string" }
              }
            }
          }
        }
      },
      LoginRequest: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", format: "email" },
                password: { type: "string" }
              }
            }
          }
        }
      },
      AccountCreateRequest: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { label: { type: "string" } }
            }
          }
        }
      }
    },
    responses: {
      Ok: {
        description: "操作成功",
        content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } }
      },
      Error: {
        description: "请求失败",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "string" } } } } }
      },
      SessionResponse: {
        description: "当前会话",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                user: { type: "object" },
                featureToggles: { type: "object" }
              }
            }
          }
        }
      }
    }
  }
};

writeFileSync(resolve(repoRoot, "docs/openapi.yaml"), `${JSON.stringify(spec, null, 2)}\n`, "utf8");
