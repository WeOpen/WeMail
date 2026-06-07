import { readFileSync } from "node:fs";

import { createRef, useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Checkbox,
  CheckboxField,
  FormField,
  MultiSelect,
  Radio,
  RadioGroupField,
  SearchInput,
  SelectInput,
  TextInput,
  TextareaInput
} from "../shared/form";

const formStyles = readFileSync("src/shared/form/form.css", "utf8");

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

  it("renders SelectInput as a custom combobox while preserving native form props", async () => {
    const user = userEvent.setup();
    const selectRef = createRef<HTMLSelectElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();
    const handleChange = vi.fn();

    render(
      <>
        <SelectInput aria-label="时区" defaultValue="asia" name="timezone" onChange={handleChange} ref={selectRef} required>
          <option value="cn">Asia/Shanghai</option>
          <option value="asia">Asia/Tokyo</option>
        </SelectInput>
        <TextareaInput defaultValue="Edge mail operations owner" ref={textareaRef} rows={3} />
      </>
    );

    const select = screen.getByRole("combobox", { name: "时区" });
    const textarea = screen.getByDisplayValue("Edge mail operations owner");

    expect(select).toHaveClass("form-control", "form-select", "ui-select-trigger");
    expect(select).toHaveTextContent("Asia/Tokyo");
    expect(select).toHaveAttribute("aria-required", "true");
    expect(selectRef.current).toHaveAttribute("name", "timezone");
    expect(selectRef.current).toHaveValue("asia");

    await user.click(select);
    const listbox = await screen.findByRole("listbox", { name: "时区" });
    expect(listbox).toHaveClass("ui-select-panel");
    expect(within(listbox).getByRole("option", { name: "Asia/Tokyo" })).toHaveAttribute("aria-selected", "true");

    await user.click(within(listbox).getByRole("option", { name: "Asia/Shanghai" }));

    expect(handleChange).toHaveBeenCalled();
    expect(handleChange.mock.calls.at(-1)?.[0].target.value).toBe("cn");
    expect(select).toHaveTextContent("Asia/Shanghai");
    expect(selectRef.current).toHaveValue("cn");
    expect(textarea).toHaveClass("form-control", "form-textarea");
    expect(textarea).toHaveAttribute("rows", "3");
    expect(textareaRef.current).toBe(textarea);
  });

  it("keeps custom select panels above modal and drawer overlays", () => {
    const selectPanelRule = formStyles.match(/\.ui-select-panel\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const zIndex = Number(selectPanelRule.match(/z-index:\s*(\d+);/)?.[1] ?? 0);

    expect(zIndex).toBeGreaterThan(60);
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

  it("renders SearchInput with clear affordance in controlled mode", async () => {
    const user = userEvent.setup();

    function Host() {
      const [value, setValue] = useState("ops");

      return (
        <SearchInput
          aria-label="搜索邮箱"
          onChange={(event) => setValue(event.target.value)}
          value={value}
        />
      );
    }

    render(<Host />);

    const input = screen.getByRole("searchbox", { name: "搜索邮箱" });
    expect(input).toHaveValue("ops");
    expect(input.closest(".ui-search-input")).toHaveAttribute("data-state", "has-value");

    await user.click(screen.getByRole("button", { name: "清除搜索" }));

    expect(input).toHaveValue("");
    expect(screen.queryByRole("button", { name: "清除搜索" })).not.toBeInTheDocument();
  });

  it("supports standalone checkbox and radio primitives without changing field APIs", async () => {
    const user = userEvent.setup();

    function RadioHost() {
      const [value, setValue] = useState("deliver");

      return (
        <>
          <Checkbox defaultChecked description="把抄送地址一并搜索" label="包含抄送" />
          <Radio
            checked={value === "deliver"}
            description="仅显示成功投递的记录"
            label="仅投递成功"
            name="delivery-state"
            onChange={() => setValue("deliver")}
            value="deliver"
            variant="card"
          />
          <Radio
            checked={value === "failed"}
            label="仅投递失败"
            name="delivery-state"
            onChange={() => setValue("failed")}
            value="failed"
            variant="card"
          />
        </>
      );
    }

    render(<RadioHost />);

    const checkbox = screen.getByRole("checkbox", { name: "包含抄送" });
    const failed = screen.getByRole("radio", { name: "仅投递失败" });

    expect(checkbox).toBeChecked();
    expect(screen.getByText("把抄送地址一并搜索")).toBeInTheDocument();
    expect(failed.closest(".form-check")).toHaveAttribute("data-state", "unchecked");

    await user.click(failed);

    expect(failed).toBeChecked();
    expect(failed.closest(".form-check")).toHaveAttribute("data-state", "checked");
  });

  it("supports uncontrolled multi-select interaction and keyboard toggling", async () => {
    const user = userEvent.setup();

    render(
      <MultiSelect
        aria-label="选择通知渠道"
        defaultValue={["email"]}
        options={[
          { label: "邮件", value: "email" },
          { label: "Telegram", value: "telegram" },
          { disabled: true, label: "Webhook", value: "webhook" }
        ]}
        placeholder="选择渠道"
      />
    );

    const trigger = screen.getByRole("button", { name: /选择通知渠道/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("邮件");

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "选择通知渠道" });
    expect(dialog).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const telegram = screen.getByRole("checkbox", { name: "Telegram" });
    telegram.focus();
    await user.keyboard(" ");

    expect(telegram).toBeChecked();
    expect(trigger).toHaveTextContent("邮件, Telegram");

    const webhook = screen.getByRole("checkbox", { name: "Webhook" });
    expect(webhook).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("supports controlled multi-select value updates", async () => {
    const user = userEvent.setup();

    function Host() {
      const [value, setValue] = useState<string[]>(["read"]);

      return (
        <MultiSelect
          aria-label="选择权限"
          onValueChange={setValue}
          options={[
            { label: "读取", value: "read" },
            { label: "写入", value: "write" },
            { label: "删除", value: "delete" }
          ]}
          value={value}
        />
      );
    }

    render(<Host />);

    const trigger = screen.getByRole("button", { name: /选择权限/i });
    expect(trigger).toHaveTextContent("读取");

    await user.click(trigger);
    await user.click(screen.getByRole("checkbox", { name: "写入" }));

    expect(trigger).toHaveTextContent("读取, 写入");
  });
});
