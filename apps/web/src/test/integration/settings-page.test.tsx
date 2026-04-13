import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("settings integration", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  it(
    "renders the shared access shell and persists theme selection across navigation",
    async () => {
      window.history.pushState({}, "", "/settings");
      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

        if (url.endsWith("/auth/session")) {
          return jsonResponse({
            user: {
              id: "member-1",
              email: "member@example.com",
              role: "member",
              createdAt: "2026-04-08T00:00:00.000Z"
            },
            featureToggles: {
              aiEnabled: true,
              telegramEnabled: true,
              outboundEnabled: true,
              mailboxCreationEnabled: true
            }
          });
        }

        if (url.endsWith("/api/mailboxes")) {
          return jsonResponse({
            mailboxes: [{ id: "box-1", address: "ops@example.com", label: "Ops", createdAt: "2026-04-08T00:00:00.000Z" }]
          });
        }
        if (url.endsWith("/api/messages?mailboxId=box-1")) {
          return jsonResponse({
            messages: [
              {
                id: "msg-1",
                mailboxId: "box-1",
                fromAddress: "ops@example.com",
                subject: "Verification",
                previewText: "Use 123456",
                bodyText: "Use 123456",
                extraction: { method: "regex", type: "auth_code", value: "123456", label: "Code" },
                oversizeStatus: null,
                attachmentCount: 0,
                attachments: [],
                receivedAt: "2026-04-08T00:00:00.000Z"
              }
            ]
          });
        }
        if (url.endsWith("/api/outbound?mailboxId=box-1")) {
          return jsonResponse({ messages: [] });
        }
        if (url.endsWith("/api/keys")) {
          return jsonResponse({ keys: [] });
        }
        if (url.endsWith("/api/telegram")) {
          return jsonResponse({ subscription: null });
        }

        return jsonResponse({});
      });

      render(<App />);

      expect(await screen.findByRole("navigation", { name: /工作台导航/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /密钥、通知与接入控制/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /API 密钥/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /Telegram 通知/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /切换到浅色主题/i }));
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(window.localStorage.getItem("wemail-workspace-theme")).toBe("light");

      fireEvent.click(within(screen.getByRole("navigation", { name: /工作台导航/i })).getByRole("link", { name: /^收件箱$/i }));
      expect(await screen.findByRole("heading", { name: /一个工作台，管理所有邮箱/i })).toBeInTheDocument();
      expect(document.documentElement.dataset.theme).toBe("light");
    },
    10000
  );
});
