import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OutboundComposeDrawer } from "../../features/outbound/OutboundComposeDrawer";
import { OutboundPanel } from "../../features/inbox/OutboundPanel";

afterEach(cleanup);

describe("outbound request recovery", () => {
  it("keeps the request key and draft after a network failure and changes the key for edited content", async () => {
    const user = userEvent.setup();
    const requests: Array<Record<string, FormDataEntryValue>> = [];
    const handleClose = vi.fn();
    render(<OutboundComposeDrawer open hasActiveMailbox onClose={handleClose} onSendMail={async (event) => {
      requests.push(Object.fromEntries(new FormData(event.currentTarget)));
      throw new Error("网络中断，请重试");
    }} />);
    await user.type(screen.getByLabelText(/收件人/), "recipient@example.com");
    await user.type(screen.getByLabelText(/主题/), "First request");
    await user.type(screen.getByLabelText(/正文/), "Keep this draft");
    await user.click(screen.getByRole("button", { name: "发送邮件" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("网络中断，请重试");
    await user.click(screen.getByRole("button", { name: "发送邮件" }));
    expect(requests).toHaveLength(2);
    expect(requests[0].requestId).toMatch(/^[\da-f-]{36}$/);
    expect(requests[1]).toEqual(requests[0]);
    expect(screen.getByLabelText(/正文/)).toHaveValue("Keep this draft");
    expect(handleClose).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/主题/), " edited");
    await user.click(screen.getByRole("button", { name: "发送邮件" }));
    expect(requests).toHaveLength(3);
    expect(requests[2].requestId).not.toBe(requests[0].requestId);
    expect(requests[2].subject).toBe("First request edited");
  });

  it("prevents closing or submitting again while a request is pending", async () => {
    const user = userEvent.setup();
    let complete!: () => void;
    const handleSend = vi.fn(() => new Promise<void>((resolve) => { complete = resolve; }));
    const handleClose = vi.fn();
    render(<OutboundComposeDrawer open hasActiveMailbox draft={{ toAddress: "recipient@example.com", subject: "Pending", bodyText: "Hello" }} onClose={handleClose} onSendMail={handleSend} />);
    await user.click(screen.getByRole("button", { name: "发送邮件" }));
    expect(screen.getByRole("button", { name: "发送中…" })).toBeDisabled();
    expect(screen.getByLabelText(/正文/)).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(handleClose).not.toHaveBeenCalled();
    expect(handleSend).toHaveBeenCalledTimes(1);
    complete();
    await waitFor(() => expect(handleClose).toHaveBeenCalledTimes(1));
  });

  it("applies the same draft lock and recovery to the inbox test-mail drawer", async () => {
    const user = userEvent.setup();
    let rejectRequest!: (error: Error) => void;
    const handleSend = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectRequest = reject; }));
    const handleClose = vi.fn();
    render(<OutboundPanel open selectedMailboxId="box-1" outboundHistory={[]} onClose={handleClose} onSendMail={handleSend} />);
    expect(screen.getByRole("dialog", { name: "发送测试邮件" })).toBeInTheDocument();
    expect(screen.getByText("首次外发后，记录会显示在这里。")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/收件人/), "recipient@example.com");
    await user.type(screen.getByLabelText(/主题/), "Pending inbox draft");
    await user.type(screen.getByLabelText(/正文/), "Preserve inbox draft");
    await user.click(screen.getByRole("button", { name: "发送邮件" }));
    expect(screen.getByRole("button", { name: "发送中…" })).toBeDisabled();
    expect(screen.getByLabelText(/主题/)).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(handleClose).not.toHaveBeenCalled();
    rejectRequest(new Error("提交失败，可重试"));
    expect(await screen.findByRole("alert")).toHaveTextContent("提交失败，可重试");
    expect(screen.getByLabelText(/正文/)).toHaveValue("Preserve inbox draft");
    expect(screen.getByRole("button", { name: "发送邮件" })).toBeEnabled();
    expect(handleSend).toHaveBeenCalledOnce();
  });
});
