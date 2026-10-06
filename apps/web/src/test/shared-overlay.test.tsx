import { readFileSync } from "node:fs";

import { useLayoutEffect, useRef, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OverlayDialog, OverlayDrawer } from "../shared/overlay";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function AsyncClosingDialog({ onClosed }: { onClosed: (isBackgroundHidden: boolean, overflow: string) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      onClosed(shellRef.current?.parentElement?.getAttribute("aria-hidden") === "true", document.body.style.overflow);
    }
  }, [isOpen, onClosed]);

  return (
    <div ref={shellRef}>
      <button type="button">恢复后的操作</button>
      {isOpen ? (
        <OverlayDialog
          onClose={() => {
            void Promise.resolve().then(() => setIsOpen(false));
          }}
          title="异步关闭"
        >
          <p>提交完成后关闭弹窗。</p>
        </OverlayDialog>
      ) : null}
    </div>
  );
}

describe("shared overlay primitives", () => {
  afterEach(() => {
    cleanup();
  });

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
    expect(drawer).toHaveAttribute("aria-describedby", screen.getByText("willxue@msn.com").id);

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
    expect(sharedStyles).toMatch(/\.ui-overlay-dialog\s*\{[^}]*border-radius:\s*32px;/);
    expect(screen.getByText("确认")).toBeInTheDocument();
    expect(screen.getByLabelText("关闭确认弹窗")).toHaveClass("ui-button-icon");
  });

  it("closes on escape for keyboard users", () => {
    const onClose = vi.fn();

    render(
      <OverlayDialog description="此操作不可恢复。" onClose={onClose} title="确认删除">
        <p>确认后立即生效。</p>
      </OverlayDialog>
    );

    fireEvent.keyDown(screen.getByRole("dialog", { name: "确认删除" }), { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus inside the dialog and marks the background inert", () => {
    render(
      <div data-testid="page-shell">
        <button type="button">外部操作</button>
        <OverlayDialog footer={<button type="button">确认</button>} onClose={() => undefined} title="聚焦测试">
          <button type="button">更多信息</button>
        </OverlayDialog>
      </div>
    );

    const dialog = screen.getByRole("dialog", { name: "聚焦测试" });
    const pageShellContainer = screen.getByTestId("page-shell").parentElement;
    const closeButton = screen.getByLabelText("关闭弹层");
    const confirmButton = screen.getByRole("button", { name: "确认" });

    expect(closeButton).toHaveFocus();
    expect(pageShellContainer).toHaveAttribute("aria-hidden", "true");

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(confirmButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(closeButton).toHaveFocus();
  });

  it("restores background accessibility and scrolling before painting an asynchronously closed dialog", async () => {
    const onClosed = vi.fn();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";

    try {
      render(<AsyncClosingDialog onClosed={onClosed} />);
      expect(screen.queryByRole("button", { name: "恢复后的操作" })).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(screen.getByRole("button", { name: "关闭弹层" }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "异步关闭" })).not.toBeInTheDocument();
      });

      expect(onClosed).toHaveBeenCalledWith(false, "auto");
      expect(screen.getByRole("button", { name: "恢复后的操作" })).toBeInTheDocument();
    } finally {
      cleanup();
      document.body.style.overflow = previousOverflow;
    }
  });
});
