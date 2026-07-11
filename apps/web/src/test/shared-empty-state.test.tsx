import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EmptyState } from "../shared/empty-state";

describe("shared empty-state primitives", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty-state title, description, icon, and actions with labeled section semantics", () => {
    render(
      <EmptyState
        actions={<button type="button">去创建邮箱</button>}
        description="新建一个收件箱后，这里会展示最近的消息。"
        icon={<span data-testid="empty-icon">0</span>}
        title="暂无收件记录"
      />
    );

    const section = screen.getByRole("region", { name: "暂无收件记录" });
    expect(section).toHaveClass("ui-empty-state", "ui-empty-state-default");
    expect(section).toHaveAttribute("data-variant", "default");
    expect(section).toContainElement(screen.getByTestId("empty-icon"));
    expect(screen.getByText("新建一个收件箱后，这里会展示最近的消息。")).toHaveClass("ui-empty-state-description");
    expect(screen.getByRole("button", { name: "去创建邮箱" }).parentElement).toHaveClass("ui-empty-state-actions");
  });

  it("supports semantic variants for error and no-access cases", () => {
    render(
      <>
        <EmptyState data-testid="error-state" title="加载失败" variant="error" />
        <EmptyState data-testid="no-access-state" title="暂无权限" variant="no-access" />
      </>
    );

    expect(screen.getByTestId("error-state")).toHaveClass("ui-empty-state", "ui-empty-state-error");
    expect(screen.getByTestId("no-access-state")).toHaveClass("ui-empty-state", "ui-empty-state-no-access");
  });

  it("shows the shared empty-state icon when callers do not provide one", () => {
    render(<EmptyState title="暂无数据" />);

    expect(screen.getByRole("region", { name: "暂无数据" }).querySelector(".ui-empty-state-media svg")).not.toBeNull();
  });
});
