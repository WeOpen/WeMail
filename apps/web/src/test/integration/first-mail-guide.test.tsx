import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MailboxSummary, MessageSummary } from "@wemail/shared";

import { FirstMailGuide } from "../../features/inbox/FirstMailGuide";
import { SetupDiagnosticsPanel } from "../../features/settings/SetupDiagnosticsPanel";

const mailbox: MailboxSummary = { id: "first", address: "first@example.test", label: "First", createdAt: "2026-11-20T00:00:00.000Z" };
const message: MessageSummary = {
  id: "mail-1", mailboxId: "first", fromAddress: "sender@example.test", subject: "WeMail 收件测试",
  previewText: "Your verification code is 482913", bodyText: "Your verification code is 482913",
  receivedAt: "2026-11-20T00:01:00.000Z", attachmentCount: 0, attachments: [], oversizeStatus: null,
  extraction: { type: "auth_code", method: "regex", value: "482913", label: "验证码" }
};

beforeEach(() => { window.localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("first mail guide", () => {
  it("advances from creating an address to a real received result and only completes after copying", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const createMailbox = vi.fn();
    const refresh = vi.fn().mockResolvedValue(undefined);
    const view = (box: MailboxSummary | null, mail: MessageSummary | null) => (
      <MemoryRouter><FirstMailGuide mailbox={box} message={mail} onCreateMailbox={createMailbox} onRefresh={refresh} role="member" /></MemoryRouter>
    );
    const { rerender } = render(view(null, null));
    await user.click(screen.getByRole("button", { name: "创建首个邮箱" }));
    expect(createMailbox).toHaveBeenCalledOnce();

    rerender(view(mailbox, null));
    expect(screen.getByRole("link", { name: "打开邮件客户端" })).toHaveAttribute("href", expect.stringContaining("mailto:first%40example.test"));
    expect(screen.getByText(/本地开发不会接收互联网邮件/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "检查收件" }));
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("link", { name: "配置 Telegram 通知" })).not.toBeInTheDocument();

    rerender(view(mailbox, message));
    expect(screen.getByText("已收到：")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "复制收到的提取结果" }));
    expect(writeText).toHaveBeenCalledWith("482913");
    expect(await screen.findByRole("link", { name: "配置 Telegram 通知" })).toHaveAttribute("href", "/telegram");
    expect(window.localStorage.getItem("wemail:first-mail:first")).toBe("complete");
  });

  it("keeps the copy step when the clipboard fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
    render(<MemoryRouter><FirstMailGuide mailbox={mailbox} message={message} onCreateMailbox={vi.fn()} onRefresh={vi.fn()} role="admin" /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "展开引导" }));
    await user.click(screen.getByRole("button", { name: "复制收到的提取结果" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("复制失败");
    expect(screen.queryByRole("link", { name: "配置 Telegram 通知" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem("wemail:first-mail:first")).toBeNull();
  });
});

describe("self hosted checks", () => {
  it("labels configuration evidence and provides repair links without claiming live routing or cron verification", () => {
    render(<MemoryRouter><SetupDiagnosticsPanel diagnostics={{
      appName: "WeMail", environment: "staging", generatedAt: "2026-11-20T00:00:00.000Z", overallStatus: "warning",
      checks: [{ id: "mail.domains", label: "邮箱域名", status: "warning", message: "仍使用默认域名", action: "改为真实域名" }]
    }} reliability={null} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "修改邮箱域名" })).toHaveAttribute("href", "#setup-domains");
    expect(screen.getByText(/尚未执行真实收件验证/)).toBeInTheDocument();
    expect(screen.getByText(/已有记录不能证明当前 Cron 配置仍有效/)).toBeInTheDocument();
    expect(screen.getByText(/暂无清理运行记录/)).toBeInTheDocument();
  });
});
