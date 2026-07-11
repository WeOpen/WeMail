import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LoadingState, Spinner } from "../shared/spinner";

describe("shared spinner primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a reusable loading state with an animated indicator", () => {
    render(<LoadingState label="正在加载账号列表" />);

    const loadingState = screen.getByRole("status", { name: "正在加载账号列表" });
    expect(loadingState).toHaveAttribute("aria-busy", "true");
    expect(loadingState.querySelector(".ui-spinner-indicator")).not.toBeNull();
    expect(screen.getByText("正在加载账号列表")).toBeInTheDocument();
  });

  it("renders an indeterminate status spinner with Chinese default copy", () => {
    render(<Spinner />);

    const spinner = screen.getByRole("status", { name: "加载中" });
    expect(spinner).toHaveClass("ui-spinner", "ui-spinner-md", "ui-tone-default");
    expect(spinner).toHaveAttribute("data-state", "indeterminate");
  });

  it("supports decorative spinners that stay hidden from assistive technology", () => {
    render(<Spinner data-testid="decorative-spinner" decorative size="sm" tone="accent" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByTestId("decorative-spinner")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("decorative-spinner")).toHaveClass("ui-spinner-sm", "ui-tone-accent");
  });

  it("can show visible loading copy with an overridable label", () => {
    render(<Spinner label="同步中" showLabel size="lg" tone="muted" />);

    const spinner = screen.getByRole("status", { name: "同步中" });
    expect(spinner).toHaveClass("ui-spinner-lg", "ui-tone-muted");
    expect(screen.getByText("同步中")).toHaveClass("ui-spinner-label");
  });
});
