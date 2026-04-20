import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SystemSettingsPage } from "../pages/SystemSettingsPage";

describe("SystemSettingsPage", () => {
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
});
