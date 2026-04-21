import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button, ButtonAnchor, ButtonLink } from "../shared/button";

describe("shared button primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders button variants and sizes with unified classes", () => {
    render(
      <>
        <Button size="md" variant="primary">
          保存资料
        </Button>
        <Button isActive size="xs" variant="ghost">
          仅看异常
        </Button>
        <Button iconOnly aria-label="关闭对话框" size="sm" variant="icon">
          x
        </Button>
      </>
    );

    expect(screen.getByRole("button", { name: "保存资料" })).toHaveClass("ui-button", "ui-button-primary", "ui-button-size-md");
    expect(screen.getByRole("button", { name: "仅看异常" })).toHaveClass("ui-button", "ui-button-ghost", "is-active", "ui-button-size-xs");
    expect(screen.getByRole("button", { name: "关闭对话框" })).toHaveClass("ui-button", "ui-button-icon", "ui-button-icon-only", "ui-button-size-sm");
  });

  it("renders link-backed button variants with the same button system classes", () => {
    render(
      <MemoryRouter>
        <ButtonLink size="lg" to="/register" variant="primary">
          开始注册
        </ButtonLink>
        <ButtonAnchor href="/api/messages/1" size="sm" variant="secondary">
          打开原始邮件
        </ButtonAnchor>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "开始注册" })).toHaveClass("ui-button", "ui-button-primary", "ui-button-size-lg");
    expect(screen.getByRole("link", { name: "打开原始邮件" })).toHaveClass("ui-button", "ui-button-secondary", "ui-button-size-sm");
  });

  it("renders loading state as busy, disabled, and visually stable", () => {
    render(
      <Button isLoading loadingLabel="保存中" variant="primary">
        保存资料
      </Button>
    );

    const button = screen.getByRole("button", { name: "保存中" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("data-state", "loading");
    expect(button).toHaveClass("ui-button-loading");
    expect(screen.getByText("保存资料")).toHaveAttribute("aria-hidden", "true");
  });

  it("prevents disabled link buttons from navigating or firing clicks", () => {
    const onClick = vi.fn();

    render(
      <MemoryRouter>
        <ButtonLink isDisabled onClick={onClick} to="/register" variant="secondary">
          开始注册
        </ButtonLink>
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: "开始注册" });
    fireEvent.click(link);

    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveClass("ui-button-disabled");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("can render complex button content without wrapping it in the label slot", () => {
    render(
      <Button contentLayout="plain" variant="ghost">
        <div data-testid="complex-content">
          <strong>ops@example.com</strong>
          <span>管理员</span>
        </div>
      </Button>
    );

    const button = screen.getByRole("button", { name: /ops@example.com/i });
    expect(button.querySelector(".ui-button-label")).not.toBeInTheDocument();
    expect(screen.getByTestId("complex-content").parentElement).toBe(button);
  });
});
