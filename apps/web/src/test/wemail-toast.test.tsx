import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createToast } from "../shared/toast";
import { WemailToastViewport } from "../shared/WemailToastViewport";

describe("WemailToastViewport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders at most three queued toasts at a time", () => {
    const dismissToast = vi.fn();
    const toasts = [
      createToast({ message: "first", tone: "success" }),
      createToast({ message: "second", tone: "info" }),
      createToast({ message: "third", tone: "success" }),
      createToast({ message: "fourth", tone: "error" })
    ];

    render(<WemailToastViewport onDismissToast={dismissToast} toasts={toasts} />);

    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    expect(screen.getByText("third")).toBeInTheDocument();
    expect(screen.queryByText("fourth")).not.toBeInTheDocument();
  });

  it("auto-dismisses success toasts after the default duration", () => {
    const toast = createToast({ message: "登录成功。", tone: "success" });
    const dismissToast = vi.fn();

    render(<WemailToastViewport onDismissToast={dismissToast} toasts={[toast]} />);

    vi.advanceTimersByTime(2999);
    expect(dismissToast).not.toHaveBeenCalled();

    vi.advanceTimersByTime(260);
    expect(dismissToast).toHaveBeenCalledWith(toast.id);
  });

  it("keeps error toasts visible until manually dismissed", () => {
    const toast = createToast({ message: "保存失败，请重试。", tone: "error" });
    const dismissToast = vi.fn();

    render(<WemailToastViewport onDismissToast={dismissToast} toasts={[toast]} />);

    vi.advanceTimersByTime(10000);
    expect(dismissToast).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /dismiss toast/i }));
    vi.advanceTimersByTime(260);
    expect(dismissToast).toHaveBeenCalledWith(toast.id);
  });
});
