import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MessageListResult, MessageSummary } from "@wemail/shared";

import { useAppStore } from "../app/appStore";
import { queryMessages } from "../features/inbox/queries";
import { useInboxWorkspace } from "../features/inbox/useInboxWorkspace";

vi.mock("../features/inbox/queries", () => ({
  queryMailboxOptions: vi.fn(),
  queryMailboxes: vi.fn(),
  queryMessageDetail: vi.fn(),
  queryMessages: vi.fn(),
  queryOutboundHistory: vi.fn()
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
});
