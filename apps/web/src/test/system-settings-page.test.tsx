import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SystemSettingsPage } from "../pages/SystemSettingsPage";

describe("SystemSettingsPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a minimal single-column system settings layout", () => {
    render(
      <SystemSettingsPage
        resolvedTheme="light"
        themePreference="system"
        onSelectThemePreference={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "系统设置" })).toBeInTheDocument();
    expect(screen.getByText("主题模式")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "外观设置" })).not.toBeInTheDocument();
    expect(screen.queryByText("选择你想要的界面明暗")).not.toBeInTheDocument();
    expect(screen.queryByText(/像 Apple 偏好设置/)).not.toBeInTheDocument();
    expect(screen.queryByText("实时预览")).not.toBeInTheDocument();
    expect(screen.queryByText("当前状态")).not.toBeInTheDocument();
    expect(screen.queryByText(/入口已预留/)).not.toBeInTheDocument();
  });

  it("offers light, dark, and system theme preferences", () => {
    const onSelectThemePreference = vi.fn();

    render(
      <SystemSettingsPage
        resolvedTheme="dark"
        themePreference="system"
        onSelectThemePreference={onSelectThemePreference}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "浅色模式" }));
    fireEvent.click(screen.getByRole("button", { name: "深色模式" }));
    fireEvent.click(screen.getByRole("button", { name: "跟随系统" }));

    expect(onSelectThemePreference).toHaveBeenNthCalledWith(1, "light");
    expect(onSelectThemePreference).toHaveBeenNthCalledWith(2, "dark");
    expect(onSelectThemePreference).toHaveBeenNthCalledWith(3, "system");
  });

  it("keeps the theme options as the only visible content block", () => {
    render(
      <SystemSettingsPage
        resolvedTheme="dark"
        themePreference="system"
        onSelectThemePreference={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "浅色模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "深色模式" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "跟随系统" })).toBeInTheDocument();
  });

  it("lets admins add and save mailbox domain suffixes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/api/system/domains") && init?.method === "PATCH") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              domains: [
                { domain: "example.com", allowedRoles: [] },
                { domain: "mail.example.org", allowedRoles: ["member"] }
              ],
              primaryDomain: "example.com"
            }),
            { headers: { "content-type": "application/json" } }
          )
        );
      }

      if (url.endsWith("/api/system/domains")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              domains: [{ domain: "example.com", allowedRoles: [] }],
              primaryDomain: "example.com"
            }),
            { headers: { "content-type": "application/json" } }
          )
        );
      }

      return Promise.resolve(new Response(JSON.stringify({}), { headers: { "content-type": "application/json" } }));
    });

    render(
      <SystemSettingsPage
        canManageDomains
        resolvedTheme="dark"
        themePreference="system"
        onSelectThemePreference={vi.fn()}
      />
    );

    expect(await screen.findByRole("heading", { name: "域名设置" })).toBeInTheDocument();
    expect(screen.getByLabelText("当前默认域名")).toHaveTextContent("@example.com");
    expect(screen.getByRole("button", { name: "移除 example.com" })).toBeInTheDocument();
    expect(screen.getByText(/所有角色可用/)).toBeInTheDocument();

    const domainInput = screen.getByLabelText("新增域名后缀");
    const addButton = screen.getByRole("button", { name: "添加域名" });

    fireEvent.change(domainInput, { target: { value: "bad-.example.com" } });
    fireEvent.click(addButton);
    expect(screen.getByRole("alert")).toHaveTextContent("请输入有效的域名后缀");

    fireEvent.change(domainInput, { target: { value: "Mail.EXAMPLE.org" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "成员" }));
    fireEvent.click(addButton);
    expect(screen.getByText("成员可用")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存域名设置" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/system\/domains$/),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            domains: [
              { domain: "example.com", allowedRoles: [] },
              { domain: "mail.example.org", allowedRoles: ["member"] }
            ]
          })
        })
      );
    });
    expect(await screen.findByText("域名设置已保存。")).toBeInTheDocument();
  });
});
