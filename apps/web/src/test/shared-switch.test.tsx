import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Switch } from "../shared/switch";

describe("shared switch primitive", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a button with role=switch, aria-checked, and ui-switch classes", () => {
    render(<Switch aria-label="启用通知" checked={false} onChange={() => {}} />);

    const control = screen.getByRole("switch", { name: "启用通知" });
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(control).toHaveClass("ui-switch", "ui-switch-size-md");
    expect(control).not.toHaveClass("is-checked");
    expect(control).toHaveAttribute("data-state", "unchecked");
  });

  it("calls onChange with the next state when clicked", () => {
    const handleChange = vi.fn();
    render(<Switch aria-label="年付" checked={false} onChange={handleChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "年付" }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("updates aria-checked and is-checked state in controlled mode", () => {
    function Host() {
      const [checked, setChecked] = useState(false);
      return <Switch aria-label="测试" checked={checked} onChange={setChecked} />;
    }

    render(<Host />);
    const control = screen.getByRole("switch", { name: "测试" });
    expect(control).toHaveAttribute("aria-checked", "false");

    fireEvent.click(control);
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(control).toHaveClass("is-checked");
    expect(control).toHaveAttribute("data-state", "checked");
  });

  it("honors size variants and disabled state", () => {
    const handleChange = vi.fn();
    render(
      <Switch aria-label="禁用开关" checked disabled onChange={handleChange} size="lg" />
    );

    const control = screen.getByRole("switch", { name: "禁用开关" });
    expect(control).toHaveClass("ui-switch-size-lg", "is-checked", "is-disabled");
    expect(control).toBeDisabled();

    fireEvent.click(control);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("derives aria-label from the label prop when label is a string", () => {
    render(<Switch checked={false} label="启用深色模式" onChange={() => {}} />);

    expect(screen.getByRole("switch", { name: "启用深色模式" })).toBeInTheDocument();
  });
});
