import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemProfilePage } from "../pages/SystemProfilePage";

const profile = {
  user: {
    id: "member-1",
    name: "Backend Admin",
    email: "admin@example.com",
    role: "admin" as const,
    status: "active" as const,
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-09T00:00:00.000Z"
  },
  preferences: {
    bio: "Backend-owned profile",
    locale: "en-US" as const,
    timezone: "Asia/Tokyo" as const,
    dateFormat: "dd-mm-yyyy" as const,
    landingPage: "/mail/list" as const,
    density: "compact" as const,
    updatedAt: "2026-04-09T00:00:00.000Z"
  }
};

describe("SystemProfilePage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders editable profile, preferences, and security cards instead of the placeholder shell", () => {
    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    expect(screen.getByText("账号资料")).toBeInTheDocument();
    expect(screen.getAllByText("使用偏好").length).toBeGreaterThan(0);
    expect(screen.getByText("安全与会话")).toBeInTheDocument();
    expect(screen.queryByText(/入口已预留/)).not.toBeInTheDocument();
  });

  it("uses a redesigned overview and side-rail layout for personal settings", () => {
    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    expect(screen.getByLabelText("个人设置概览")).toHaveClass("profile-overview-panel");
    expect(screen.getByLabelText("资料与偏好表单")).toHaveClass("profile-main-column");
    expect(screen.getByLabelText("个人设置侧栏")).toHaveClass("profile-side-rail");
  });

  it("renders profile and preferences from backend data instead of mock defaults", () => {
    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    const displayName = screen.getByLabelText("显示名");
    const bio = screen.getByLabelText("个人简介");
    const locale = screen.getByLabelText("语言");
    const timezone = screen.getByLabelText("时区");
    const landingPage = screen.getByLabelText("默认进入页");
    const densityCompact = screen.getByRole("radio", { name: "紧凑" });

    expect(displayName).toHaveClass("form-control");
    expect(bio).toHaveClass("form-control");
    expect(locale).toHaveClass("form-control");
    expect(timezone).toHaveClass("form-control");
    expect(landingPage).toHaveClass("form-control");
    expect(densityCompact).toHaveClass("form-check-input");
    expect(displayName).toHaveValue("Backend Admin");
    expect(bio).toHaveValue("Backend-owned profile");
    expect(locale).toHaveTextContent("English");
    expect(timezone).toHaveTextContent("Asia/Tokyo");
    expect(landingPage).toHaveTextContent("邮件列表");
    expect(densityCompact).toBeChecked();
  });

  it("shortens long profile emails while keeping the full address available on hover", () => {
    const longEmail = "5dcn5bfvq26x9a3mceg7t3mbhy00swdpn3hxaxj213f4h110bk@privaterelay.linux.do";

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={{ ...profile, user: { ...profile.user, email: longEmail } }}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    const shortenedEmail = "5dcn5bfv...h110bk@privaterelay.linux.do";

    expect(screen.getByLabelText("邮箱")).toHaveValue(shortenedEmail);
    expect(screen.getAllByText(shortenedEmail)).toHaveLength(2);
    expect(screen.getAllByTitle(longEmail)).toHaveLength(3);
    expect(screen.queryByText(longEmail)).not.toBeInTheDocument();
  });

  it("formats account dates with the saved profile date preference", () => {
    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    expect(screen.getByText("08-04-2026")).toBeInTheDocument();
    expect(screen.getAllByText("09-04-2026").length).toBeGreaterThan(0);
  });

  it("keeps save actions disabled until the form values change", async () => {
    const user = userEvent.setup();

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "保存资料" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存偏好" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "Renamed User" } });
    expect(screen.getByRole("button", { name: "保存资料" })).toBeEnabled();

    await user.click(screen.getByRole("combobox", { name: "默认进入页" }));
    await user.click(screen.getByRole("option", { name: "仪表盘" }));
    expect(screen.getByRole("button", { name: "保存偏好" })).toBeEnabled();
  });

  it("shows inline errors when saving profile or preferences fails", async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn().mockRejectedValue(new Error("profile save failed"));
    const onSavePreferences = vi.fn().mockRejectedValue(new Error("preferences save failed"));

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={onSavePreferences}
        onSaveProfile={onSaveProfile}
      />
    );

    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "Renamed User" } });
    fireEvent.click(screen.getByRole("button", { name: "保存资料" }));

    expect(await screen.findByRole("alert", { name: "资料保存失败" })).toHaveTextContent("profile save failed");

    await user.click(screen.getByRole("combobox", { name: "默认进入页" }));
    await user.click(screen.getByRole("option", { name: "仪表盘" }));
    fireEvent.click(screen.getByRole("button", { name: "保存偏好" }));

    expect(await screen.findByRole("alert", { name: "偏好保存失败" })).toHaveTextContent("preferences save failed");
  });

  it("submits profile and preference updates as explicit backend payloads", async () => {
    const user = userEvent.setup();
    const onSaveProfile = vi.fn().mockResolvedValue(undefined);
    const onSavePreferences = vi.fn().mockResolvedValue(undefined);

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={vi.fn()}
        onSavePreferences={onSavePreferences}
        onSaveProfile={onSaveProfile}
      />
    );

    fireEvent.change(screen.getByLabelText("显示名"), { target: { value: "Renamed User" } });
    fireEvent.change(screen.getByLabelText("个人简介"), { target: { value: "Owns backend profile settings" } });
    fireEvent.click(screen.getByRole("button", { name: "保存资料" }));

    await waitFor(() => {
      expect(onSaveProfile).toHaveBeenCalledWith({
        name: "Renamed User",
        preferences: {
          bio: "Owns backend profile settings"
        }
      });
    });

    await user.click(screen.getByRole("combobox", { name: "语言" }));
    await user.click(screen.getByRole("option", { name: "简体中文" }));
    await user.click(screen.getByRole("combobox", { name: "时区" }));
    await user.click(screen.getByRole("option", { name: "Asia/Shanghai" }));
    await user.click(screen.getByRole("combobox", { name: "日期格式" }));
    await user.click(screen.getByRole("option", { name: "YYYY-MM-DD" }));
    await user.click(screen.getByRole("combobox", { name: "默认进入页" }));
    await user.click(screen.getByRole("option", { name: "仪表盘" }));
    await user.click(screen.getByRole("radio", { name: "舒展" }));
    await user.click(screen.getByRole("button", { name: "保存偏好" }));

    await waitFor(() => {
      expect(onSavePreferences).toHaveBeenCalledWith({
        preferences: {
          locale: "zh-CN",
          timezone: "Asia/Shanghai",
          dateFormat: "yyyy-mm-dd",
          landingPage: "/dashboard",
          density: "comfortable"
        }
      });
    });
  });

  it("shows the real current session action in the security section", () => {
    const onLogoutCurrentDevice = vi.fn();

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        onLogoutCurrentDevice={onLogoutCurrentDevice}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "退出当前设备" }));

    expect(onLogoutCurrentDevice).toHaveBeenCalledTimes(1);
  });

  it("renders active sessions and wires revoke actions", () => {
    const onRevokeSession = vi.fn().mockResolvedValue(undefined);
    const onRevokeOtherSessions = vi.fn().mockResolvedValue(undefined);

    render(
      <SystemProfilePage
        isSavingPreferences={false}
        isSavingProfile={false}
        profile={profile}
        sessions={[
          {
            id: "session-current",
            userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
            ipAddress: "203.0.113.10",
            createdAt: "2026-04-09T00:00:00.000Z",
            lastSeenAt: "2026-04-09T02:30:00.000Z",
            expiresAt: "2026-04-12T00:00:00.000Z",
            isCurrent: true
          },
          {
            id: "session-other",
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
            ipAddress: "198.51.100.12",
            createdAt: "2026-04-08T00:00:00.000Z",
            lastSeenAt: "2026-04-08T08:10:00.000Z",
            expiresAt: "2026-04-11T00:00:00.000Z",
            isCurrent: false
          }
        ]}
        onLogoutCurrentDevice={vi.fn()}
        onRevokeOtherSessions={onRevokeOtherSessions}
        onRevokeSession={onRevokeSession}
        onSavePreferences={vi.fn()}
        onSaveProfile={vi.fn()}
      />
    );

    expect(screen.getByText("Chrome · macOS")).toBeInTheDocument();
    expect(screen.getByText("Chrome · Windows")).toBeInTheDocument();
    expect(screen.getByText("当前")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "撤销会话 Chrome · Windows" }));
    fireEvent.click(screen.getByRole("button", { name: "退出其他设备" }));

    expect(screen.getByRole("button", { name: "当前会话请使用退出当前设备" })).toBeDisabled();
    expect(onRevokeSession).toHaveBeenCalledWith("session-other");
    expect(onRevokeOtherSessions).toHaveBeenCalledTimes(1);
  });
});
