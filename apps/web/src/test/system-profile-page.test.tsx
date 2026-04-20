import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SystemProfilePage } from "../pages/SystemProfilePage";

describe("SystemProfilePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders editable profile, preferences, and security cards instead of the placeholder shell", () => {
    render(
      <SystemProfilePage
        sessionSummary={{
          email: "admin@example.com",
          role: "管理员",
          createdAtLabel: "2026-04-08"
        }}
      />
    );

    expect(screen.getByText("账号资料")).toBeInTheDocument();
    expect(screen.getByText("使用偏好")).toBeInTheDocument();
    expect(screen.getByText("安全与会话")).toBeInTheDocument();
    expect(screen.queryByText(/入口已预留/)).not.toBeInTheDocument();
  });

  it("allows editing the profile and preference controls inline", () => {
    render(
      <SystemProfilePage
        sessionSummary={{
          email: "admin@example.com",
          role: "管理员",
          createdAtLabel: "2026-04-08"
        }}
      />
    );

    const displayName = screen.getByLabelText("显示名");
    const bio = screen.getByLabelText("个人简介");
    const locale = screen.getByLabelText("语言");
    const timezone = screen.getByLabelText("时区");
    const landingPage = screen.getByLabelText("默认进入页");
    const densityCompact = screen.getByRole("radio", { name: "紧凑" });

    fireEvent.change(displayName, { target: { value: "WeMail Admin" } });
    fireEvent.change(locale, { target: { value: "en-US" } });
    fireEvent.change(timezone, { target: { value: "Asia/Tokyo" } });
    fireEvent.change(landingPage, { target: { value: "/mail/list" } });
    fireEvent.click(densityCompact);

    expect(displayName).toHaveClass("form-control");
    expect(bio).toHaveClass("form-control");
    expect(locale).toHaveClass("form-control");
    expect(timezone).toHaveClass("form-control");
    expect(landingPage).toHaveClass("form-control");
    expect(densityCompact).toHaveClass("form-check-input");
    expect(displayName).toHaveValue("WeMail Admin");
    expect(locale).toHaveValue("en-US");
    expect(timezone).toHaveValue("Asia/Tokyo");
    expect(landingPage).toHaveValue("/mail/list");
    expect(densityCompact).toBeChecked();
  });

  it("shows session actions in the security section", () => {
    render(
      <SystemProfilePage
        sessionSummary={{
          email: "admin@example.com",
          role: "管理员",
          createdAtLabel: "2026-04-08"
        }}
      />
    );

    expect(screen.getByRole("button", { name: "修改密码" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出当前设备" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出其他设备" })).toBeInTheDocument();
  });
});
