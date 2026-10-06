import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiKeysPage } from "../features/settings/ApiKeysPage";

function renderApiKeys() {
  const view = render(
    <MemoryRouter>
      <ApiKeysPage apiKeys={[]} onCreateApiKey={vi.fn()} onRevokeApiKey={vi.fn()} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByRole("button", { name: "展开调用示例" }));
  return view;
}

describe("API key copy feedback lifecycle", () => {
  let clipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    if (clipboardDescriptor) {
      Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }
  });

  it("releases the copy feedback timeout when leaving the API key page", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    const view = renderApiKeys();
    const copyButton = screen.getByRole("button", { name: "复制 Authorization Header" });

    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(copyButton).toHaveClass("is-copied");
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start feedback after a pending clipboard operation completes on an unmounted page", async () => {
    let completeCopy: () => void = () => undefined;
    const clipboardResult = new Promise<void>((resolve) => {
      completeCopy = resolve;
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockReturnValue(clipboardResult) }
    });
    const view = renderApiKeys();
    fireEvent.click(screen.getByRole("button", { name: "复制 Authorization Header" }));
    view.unmount();

    await act(async () => {
      completeCopy();
      await clipboardResult;
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
