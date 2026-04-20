import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CheckboxField, FormField, RadioGroupField, SelectInput, TextInput, TextareaInput } from "../shared/form";

describe("shared form primitives", () => {
  it("associates FormField labels with wrapped controls", () => {
    render(
      <FormField description="用于登录" label="邮箱" required>
        <TextInput name="email" type="email" />
      </FormField>
    );

    expect(screen.getByLabelText(/^邮箱/)).toHaveAttribute("name", "email");
    expect(screen.getByText("用于登录")).toBeInTheDocument();
  });

  it("forwards props, className, and ref on text inputs", () => {
    const ref = createRef<HTMLInputElement>();
    const handleChange = vi.fn();

    render(
      <TextInput
        className="custom-control"
        disabled
        onChange={handleChange}
        readOnly
        ref={ref}
        required
        value="hello@example.com"
      />
    );

    const input = screen.getByDisplayValue("hello@example.com");
    expect(input).toHaveClass("form-control", "custom-control");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("readonly");
    expect(input).toBeRequired();
    expect(ref.current).toBe(input);
  });

  it("forwards props and ref on select and textarea controls", () => {
    const selectRef = createRef<HTMLSelectElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();

    render(
      <>
        <SelectInput defaultValue="asia" disabled ref={selectRef} required>
          <option value="cn">Asia/Shanghai</option>
          <option value="asia">Asia/Tokyo</option>
        </SelectInput>
        <TextareaInput defaultValue="Edge mail operations owner" ref={textareaRef} rows={3} />
      </>
    );

    const select = screen.getByRole("combobox");
    const textarea = screen.getByDisplayValue("Edge mail operations owner");

    expect(select).toHaveClass("form-control", "form-select");
    expect(select).toBeDisabled();
    expect(select).toBeRequired();
    expect(selectRef.current).toBe(select);
    expect(textarea).toHaveClass("form-control", "form-textarea");
    expect(textarea).toHaveAttribute("rows", "3");
    expect(textareaRef.current).toBe(textarea);
  });

  it("renders checkbox labels and descriptions with shared classes", () => {
    render(
      <CheckboxField
        defaultChecked
        description="开启后会同步异常通知"
        disabled
        label="失败告警"
        variant="card"
      />
    );

    const checkbox = screen.getByRole("checkbox", { name: "失败告警" });
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass("form-check-input");
    expect(screen.getByText("开启后会同步异常通知")).toBeInTheDocument();
  });

  it("renders radio groups with shared option classes and changes selection", () => {
    render(
      <RadioGroupField
        defaultValue="comfortable"
        description="决定邮件列表的默认阅读节奏。"
        legend="邮件阅读密度"
        name="density"
        options={[
          { label: "舒展", value: "comfortable" },
          { description: "更适合高密度列表", label: "紧凑", value: "compact" }
        ]}
        variant="card"
      />
    );

    const comfortable = screen.getByRole("radio", { name: "舒展" });
    const compact = screen.getByRole("radio", { name: "紧凑" });

    expect(comfortable).toBeChecked();
    expect(compact).not.toBeChecked();
    expect(compact).toHaveClass("form-check-input");
    expect(screen.getByText("决定邮件列表的默认阅读节奏。")).toBeInTheDocument();

    fireEvent.click(compact);

    expect(compact).toBeChecked();
  });
});
