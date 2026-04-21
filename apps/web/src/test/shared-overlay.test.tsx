import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OverlayDialog, OverlayDrawer } from "../shared/overlay";

describe("shared overlay primitives", () => {
  it("renders a right drawer with unified shell classes and backdrop close behavior", () => {
    const onClose = vi.fn();

    render(
      <OverlayDrawer
        closeLabel="关闭用户设置"
        closeOnBackdrop
        description="willxue@msn.com"
        eyebrow="用户设置"
        onClose={onClose}
        title="willxue"
      >
        <p>抽屉内容</p>
      </OverlayDrawer>
    );

    const drawer = screen.getByRole("dialog", { name: "willxue" });
    expect(drawer).toHaveClass("ui-overlay-panel", "ui-overlay-drawer", "panel");
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("用户设置")).toHaveClass("ui-overlay-eyebrow");
    expect(screen.getByText("willxue@msn.com")).toHaveClass("ui-overlay-description");

    fireEvent.click(screen.getByTestId("overlay-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a centered dialog with shared footer actions", () => {
    render(
      <OverlayDialog
        closeLabel="关闭确认弹窗"
        footer={<button type="button">确认</button>}
        onClose={() => undefined}
        title="确认彻底删除"
      >
        <p>此操作不可恢复。</p>
      </OverlayDialog>
    );

    const dialog = screen.getByRole("dialog", { name: "确认彻底删除" });
    expect(dialog).toHaveClass("ui-overlay-panel", "ui-overlay-dialog", "panel");
    expect(screen.getByText("确认")).toBeInTheDocument();
    expect(screen.getByLabelText("关闭确认弹窗")).toHaveClass("ui-button-icon");
  });
});
