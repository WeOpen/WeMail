import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageListResult, MessageSummary, OutboundMessageStatus } from "@wemail/shared";
import type { FormEvent } from "react";

import { useAppStore } from "../app/appStore";
import { queryMessages, queryOutboundHistory } from "../features/inbox/queries";
import { sendOutboundAction } from "../features/inbox/actions";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";

vi.mock("../features/inbox/queries", () => ({
  queryMailboxOptions: vi.fn(),
  queryMailboxes: vi.fn(),
  queryMessageDetail: vi.fn(),
  queryMessages: vi.fn(),
  queryOutboundHistory: vi.fn()
}));

vi.mock("../features/inbox/actions", () => ({
  batchMessagesAction: vi.fn(),
  createMailboxAction: vi.fn(),
  sendOutboundAction: vi.fn()
}));

const messageOne: MessageSummary = {
  id: "msg-1",
  mailboxId: "box-1",
  fromAddress: "first@example.com",
  subject: "First message",
  previewText: "First",
  bodyText: "First",
  extraction: { method: "none", type: "none", value: "", label: "None" },
  oversizeStatus: null,
  attachmentCount: 0,
  attachments: [],
  receivedAt: "2026-04-08T00:00:00.000Z"
};

const messageTwo: MessageSummary = {
  ...messageOne,
  id: "msg-2",
  fromAddress: "second@example.com",
  subject: "Second message"
};

const messageListResult: MessageListResult = {
  messages: [messageOne, messageTwo],
  total: 2,
  page: 1,
  pageSize: 10,
  summary: {
    messageCount: 2,
    extractionCount: 0,
    attachmentCount: 0
  }
};

function InboxWorkspaceHarness() {
  const inbox = useInboxWorkspace({ enabled: false, onToast: vi.fn() });

  return (
    <button onClick={() => void inbox.refreshMessages({ page: 1, pageSize: 10, filter: "all" })} type="button">
      Refresh messages
    </button>
  );
}

describe("useInboxWorkspace", () => {
  beforeEach(() => {
    vi.mocked(queryMessages).mockReset();
    vi.mocked(sendOutboundAction).mockReset();
    vi.mocked(queryOutboundHistory).mockResolvedValue({ messages: [], total: 0, page: 1, pageSize: 6, summary: { totalCount: 0, sentCount: 0, failedCount: 0 } });
  });

  it("keeps the selected message when refreshing a list that still contains it", async () => {
    const user = userEvent.setup();
    vi.mocked(queryMessages).mockResolvedValue(messageListResult);
    useAppStore.setState({
      messages: [messageOne, messageTwo],
      selectedMessageId: messageTwo.id
    });

    render(<InboxWorkspaceHarness />);

    await user.click(screen.getByRole("button", { name: /^Refresh messages$/i }));

    await waitFor(() => {
      expect(queryMessages).toHaveBeenCalledTimes(1);
    });
    expect(useAppStore.getState().selectedMessageId).toBe(messageTwo.id);
  });

  it.each([
    ["queued", "info", "入队"], ["sending", "info", "正在提交"],
    ["accepted", "success", "供应商已受理"], ["delivered", "success", "送达收件服务器"],
    ["bounced", "error", "退回"], ["complained", "error", "垃圾邮件"],
    ["failed", "error", "发送失败"], ["uncertain", "info", "待确认"],
    ["sent", "info", "历史记录"]
  ] as const)("reports %s with its actual delivery meaning", async (status, tone, message) => {
    const onToast = vi.fn();
    useAppStore.setState({ mailboxes: [{ id: "box-1", address: "sender@example.com", label: "Sender", createdAt: "2026-11-20T00:00:00.000Z" }], selectedMailboxId: "box-1" });
    vi.mocked(sendOutboundAction).mockResolvedValue({ message: { id: "send-1", status: status as OutboundMessageStatus } });
    const { result } = renderHook(() => useInboxWorkspace({ enabled: false, onToast }));
    const form = document.createElement("form");
    for (const [name, value] of Object.entries({ toAddress: "recipient@example.com", subject: "Status check", bodyText: "Hello" })) {
      const field = document.createElement("input");
      field.name = name;
      field.value = value;
      form.append(field);
    }
    await act(() => result.current.sendMail({ currentTarget: form, preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>));
    expect(onToast).toHaveBeenCalledWith({ tone, message: expect.stringContaining(message) });
  });

  it("rejects sending without a mailbox before resetting the draft or reporting success", async () => {
    const onToast = vi.fn();
    const { result } = renderHook(() => useInboxWorkspace({ enabled: false, onToast }));
    const form = document.createElement("form");
    const reset = vi.spyOn(form, "reset");
    await expect(result.current.sendMail({ currentTarget: form, preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>)).rejects.toThrow("当前没有可用邮箱");
    expect(reset).not.toHaveBeenCalled();
    expect(sendOutboundAction).not.toHaveBeenCalled();
    expect(onToast).not.toHaveBeenCalled();
  });
});
