# WeMail Mail List Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild `/mail/list` into an extraction-first inbox workspace that helps QA users grab codes and links faster without losing the familiar mailbox-client reading flow.

**Architecture:** Keep the existing `/mail/list` route, `useInboxWorkspace` hook, and backend contracts intact. Recompose the page around a new top summary bar, a lighter mailbox nav, an extraction-first message list, a task-first detail panel, and a send-mail drawer that stays closed by default. Because `MessageSummary` currently has no unread flag, the first pass should render the middle summary pill as `当前消息` (derived from `messages.length`) while preserving the layout slot so a future unread count can drop in without another redesign.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest + Testing Library, Playwright, shared CSS in `apps/web/src/shared/styles/index.css`

---

### Task 1: Lock the redesigned inbox shell with failing integration and smoke coverage

**Files:**
- Create: `apps/web/src/test/integration/inbox-page.test.tsx`
- Modify: `apps/web/e2e/smoke.spec.ts:3-54,137-141`

**Step 1: Write the failing integration test for the new mail-list hierarchy**

Create `apps/web/src/test/integration/inbox-page.test.tsx` with this test first:

```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../app/App";
import { jsonResponse } from "../helpers/mock-api";

describe("mail list integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.history.pushState({}, "", "/mail/list");
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

      if (url.endsWith("/auth/session")) {
        return jsonResponse({
          user: { id: "member-1", email: "member@example.com", role: "member", createdAt: "2026-04-08T00:00:00.000Z" },
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }

      if (url.endsWith("/api/mailboxes")) {
        return jsonResponse({
          mailboxes: [{ id: "box-1", address: "qa-signup@example.com", label: "QA Signup", createdAt: "2026-04-08T00:00:00.000Z" }]
        });
      }

      if (url.endsWith("/api/messages?mailboxId=box-1")) {
        return jsonResponse({
          messages: [
            {
              id: "msg-1",
              mailboxId: "box-1",
              fromAddress: "no-reply@acme.dev",
              subject: "Verify your email",
              previewText: "Use 482913 to finish sign in",
              bodyText: "Use 482913 to finish sign in",
              extraction: { method: "regex", type: "auth_code", value: "482913", label: "验证码" },
              oversizeStatus: null,
              attachmentCount: 0,
              attachments: [],
              receivedAt: "2026-04-08T00:00:00.000Z"
            },
            {
              id: "msg-2",
              mailboxId: "box-1",
              fromAddress: "auth@contoso.io",
              subject: "Your login link",
              previewText: "Open the login link",
              bodyText: "Open the login link",
              extraction: { method: "regex", type: "auth_link", value: "https://contoso.test/magic", label: "登录链接" },
              oversizeStatus: null,
              attachmentCount: 1,
              attachments: [
                { id: "att-1", filename: "device.txt", contentType: "text/plain", size: 1024, key: "attachments/device.txt" }
              ],
              receivedAt: "2026-04-08T00:01:00.000Z"
            }
          ]
        });
      }

      if (url.endsWith("/api/outbound?mailboxId=box-1")) return jsonResponse({ messages: [] });
      if (url.endsWith("/api/keys")) return jsonResponse({ keys: [] });
      if (url.endsWith("/api/telegram")) return jsonResponse({ subscription: null });
      if (url.endsWith("/admin/users")) return jsonResponse({ users: [] });
      if (url.endsWith("/admin/invites")) return jsonResponse({ invites: [] });
      if (url.endsWith("/admin/features")) {
        return jsonResponse({
          featureToggles: {
            aiEnabled: true,
            telegramEnabled: true,
            outboundEnabled: true,
            mailboxCreationEnabled: true
          }
        });
      }
      if (url.includes("/admin/quotas/")) {
        return jsonResponse({
          quota: {
            userId: "member-1",
            dailyLimit: 20,
            sendsToday: 0,
            disabled: false,
            updatedAt: "2026-04-08T00:00:00.000Z"
          }
        });
      }
      if (url.endsWith("/admin/mailboxes")) return jsonResponse({ mailboxes: [] });

      return jsonResponse({});
    });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  it("renders the extraction-first mail workspace instead of the old four-panel inbox", async () => {
    render(<App />);

    expect(await screen.findByText(/待提取/i)).toBeInTheDocument();
    expect(screen.getByText(/当前消息/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^发送测试邮件$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^消息列表$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^消息详情$/i })).toBeInTheDocument();
    expect(screen.getAllByText("482913").length).toBeGreaterThan(0);
    expect(screen.getByText(/LOGIN LINK/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^发送邮件$/i })).not.toBeInTheDocument();

    const mailboxPanel = screen.getByRole("heading", { name: /^邮箱$/i }).closest("section");
    expect(within(mailboxPanel as HTMLElement).getByText(/QA Signup/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
```

Expected: FAIL because the current page still renders `最新消息`, keeps the always-open `发送邮件` panel, and has no summary strip.

**Step 3: Update the authenticated smoke test to check the new shell**

In `apps/web/e2e/smoke.spec.ts`, keep `mockAuthenticatedMember()` but change the mail assertions to this:

```ts
await sidebar.getByRole("link", { name: /^邮件(?:\s|$)/i }).click();
await expect(page.getByRole("navigation", { name: /邮件 二级菜单/i })).toBeVisible();
await expect(page.getByText(/待提取/i)).toBeVisible();
await expect(page.getByRole("heading", { name: /^消息列表$/i })).toBeVisible();
await expect(page.getByRole("heading", { name: /^消息详情$/i })).toBeVisible();
await expect(page.getByRole("button", { name: /^发送测试邮件$/i })).toBeVisible();
await expect(page.locator(".message-extraction-chip").first()).toContainText("123456");
await expect(page.getByRole("heading", { name: /^发送邮件$/i })).toHaveCount(0);
```

Do not implement anything yet; this smoke assertion should also fail against the current UI.

**Step 4: Run the smoke test to verify it fails**

Run:

```bash
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shows the reworked shared access shell"
```

Expected: FAIL after the new mail assertions because the updated mail workspace does not exist yet.

**Step 5: Commit the red tests once both fail exactly for the expected reasons**

```bash
git add apps/web/src/test/integration/inbox-page.test.tsx apps/web/e2e/smoke.spec.ts

git commit -F - <<'EOF'
Anchor the mail-list redesign with failing UI coverage

The inbox redesign needs coverage before the layout is touched so the new
summary strip, extraction-first list, and hidden send drawer are all locked
by tests instead of taste.

Constraint: The implementation must preserve the existing /mail/list route and current fetch contracts
Rejected: Start coding the redesign before adding tests | too easy to lose the approved hierarchy during refactor
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep this test focused on hierarchy and primary actions, not pixel values
Tested: Targeted Vitest failure, targeted Playwright failure
Not-tested: Passing implementation
EOF
```

### Task 2: Replace the old four-panel inbox layout with the approved summary bar and mailbox shell

**Files:**
- Create: `apps/web/src/features/inbox/InboxSummaryBar.tsx`
- Modify: `apps/web/src/pages/InboxPage.tsx:1-130`
- Modify: `apps/web/src/features/inbox/MailboxPanel.tsx:1-45`
- Modify: `apps/web/src/shared/styles/index.css:1193-1213,2105-2122,3139-3218`

**Step 1: Add the new summary-bar component**

Create `apps/web/src/features/inbox/InboxSummaryBar.tsx`:

```tsx
import type { MailboxSummary } from "@wemail/shared";

type InboxSummaryBarProps = {
  selectedMailbox: MailboxSummary | null;
  extractionCount: number;
  messageCount: number;
  attachmentCount: number;
  onOpenMailboxComposer: () => void;
  onOpenOutboundDrawer: () => void;
};

export function InboxSummaryBar({
  selectedMailbox,
  extractionCount,
  messageCount,
  attachmentCount,
  onOpenMailboxComposer,
  onOpenOutboundDrawer
}: InboxSummaryBarProps) {
  return (
    <section className="panel workspace-card inbox-summary-bar" aria-label="邮件摘要工具条">
      <div className="inbox-summary-mailbox">
        <p className="panel-kicker">当前邮箱</p>
        <h2>{selectedMailbox?.label ?? "未选择邮箱"}</h2>
        <p>{selectedMailbox?.address ?? "先创建或选择一个邮箱开始查看邮件。"}</p>
      </div>
      <dl className="inbox-summary-stats" aria-label="邮件摘要统计">
        <div>
          <dt>待提取</dt>
          <dd>{extractionCount}</dd>
        </div>
        <div>
          <dt>当前消息</dt>
          <dd>{messageCount}</dd>
        </div>
        <div>
          <dt>附件</dt>
          <dd>{attachmentCount}</dd>
        </div>
      </dl>
      <div className="inbox-summary-actions">
        <button className="workspace-action-button secondary" onClick={onOpenMailboxComposer} type="button">
          新建邮箱
        </button>
        <button className="workspace-action-button primary" onClick={onOpenOutboundDrawer} type="button">
          发送测试邮件
        </button>
      </div>
    </section>
  );
}
```

**Step 2: Rebuild `InboxPage` around summary + three-column shell**

Update `apps/web/src/pages/InboxPage.tsx` so the top of the component matches this shape:

```tsx
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import type { MailboxSummary, MessageSummary } from "@wemail/shared";

import { InboxSummaryBar } from "../features/inbox/InboxSummaryBar";
import { MailboxPanel } from "../features/inbox/MailboxPanel";
import { MessageDetailPanel } from "../features/inbox/MessageDetailPanel";
import { MessageStreamPanel } from "../features/inbox/MessageStreamPanel";
import { OutboundPanel } from "../features/inbox/OutboundPanel";
import type { OutboundHistoryItem } from "../features/inbox/types";

function countExtractedMessages(messages: MessageSummary[]) {
  return messages.filter((message) => message.extraction.type !== "none" && message.extraction.value.trim().length > 0).length;
}

function countAttachments(messages: MessageSummary[]) {
  return messages.reduce((sum, message) => sum + message.attachmentCount, 0);
}

export function InboxPage(props: InboxPageProps) {
  const {
    mailboxes,
    selectedMailboxId,
    messages,
    selectedMessageId,
    selectedMessage,
    outboundHistory,
    mailboxComposerOpen,
    onCloseMailboxComposer,
    onCreateMailbox,
    onOpenMailboxComposer,
    onSelectMailbox,
    onSelectMessage,
    onRefreshMessages,
    onSendMail
  } = props;

  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outboundDrawerOpen, setOutboundDrawerOpen] = useState(false);

  const selectedMailbox = useMemo(
    () => mailboxes.find((mailbox) => mailbox.id === selectedMailboxId) ?? null,
    [mailboxes, selectedMailboxId]
  );

  const suggestedLabel = useMemo(() => `Mailbox ${mailboxes.length + 1}`, [mailboxes.length]);
  const extractionCount = useMemo(() => countExtractedMessages(messages), [messages]);
  const attachmentCount = useMemo(() => countAttachments(messages), [messages]);

  useEffect(() => {
    if (mailboxComposerOpen) {
      setLabel(suggestedLabel);
      setIsSubmitting(false);
    }
  }, [mailboxComposerOpen, suggestedLabel]);

  return (
    <>
      <main className="workspace-grid inbox-page-grid">
        <InboxSummaryBar
          selectedMailbox={selectedMailbox}
          extractionCount={extractionCount}
          messageCount={messages.length}
          attachmentCount={attachmentCount}
          onOpenMailboxComposer={onOpenMailboxComposer}
          onOpenOutboundDrawer={() => setOutboundDrawerOpen(true)}
        />
        <div className="workspace-grid inbox-grid">
          {/* MailboxPanel / MessageStreamPanel / MessageDetailPanel stay here */}
        </div>
      </main>

      <OutboundPanel
        selectedMailboxId={selectedMailboxId}
        outboundHistory={outboundHistory}
        open={outboundDrawerOpen}
        onClose={() => setOutboundDrawerOpen(false)}
        onSendMail={onSendMail}
      />

      {/* keep the existing mailbox dialog block unchanged below */}
    </>
  );
}
```

Keep the mailbox creation dialog logic exactly as-is in this task.

**Step 3: Demote the left rail from “current mailbox hero” to “mailbox nav”**

Rewrite `apps/web/src/features/inbox/MailboxPanel.tsx` to this structure:

```tsx
export function MailboxPanel({ mailboxes, selectedMailboxId, onSelectMailbox, onOpenMailboxComposer }: MailboxPanelProps) {
  return (
    <section className="panel workspace-card mailbox-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">邮箱导航</p>
          <h2>邮箱</h2>
        </div>
        <button className="workspace-action-button ghost" onClick={onOpenMailboxComposer} type="button">
          新建
        </button>
      </div>
      <div className="mailbox-list workspace-stack-list">
        {mailboxes.map((mailbox) => (
          <button
            key={mailbox.id}
            className={mailbox.id === selectedMailboxId ? "mailbox-item active" : "mailbox-item"}
            onClick={() => onSelectMailbox(mailbox.id)}
            type="button"
          >
            <div className="mailbox-item-top">
              <strong>{mailbox.label}</strong>
              <small>{mailbox.createdAt.slice(0, 10)}</small>
            </div>
            <span>{mailbox.address}</span>
          </button>
        ))}
        {mailboxes.length === 0 ? <p className="empty-state">当前还没有激活邮箱，先创建一个开始接收邮件。</p> : null}
      </div>
    </section>
  );
}
```

**Step 4: Add the CSS skeleton for the new summary strip and page grid**

Append these rules to `apps/web/src/shared/styles/index.css` near the existing inbox block:

```css
.inbox-page-grid {
  gap: 18px;
}

.inbox-summary-bar {
  grid-template-columns: minmax(260px, 1.1fr) repeat(3, minmax(120px, 0.45fr)) auto;
  align-items: stretch;
}

.inbox-summary-mailbox,
.inbox-summary-stats,
.inbox-summary-actions {
  display: grid;
  gap: 10px;
}

.inbox-summary-stats {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.inbox-summary-stats div {
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface-muted);
}

.inbox-summary-stats dt,
.inbox-summary-stats dd {
  margin: 0;
}

.inbox-summary-stats dd {
  font-size: clamp(1.3rem, 2vw, 1.8rem);
  font-weight: 800;
  letter-spacing: -0.04em;
}

.mailbox-item-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
```

Then replace the old `.inbox-grid`, `.detail-panel`, and `.composer-panel` breakpoint rules so the drawer no longer participates in the main grid.

**Step 5: Run the red tests again and commit once the new shell passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shows the reworked shared access shell"
```

Expected: PASS. The new summary strip, renamed mailbox panel, and hidden send panel should satisfy both tests.

Then commit:

```bash
git add \
  apps/web/src/features/inbox/InboxSummaryBar.tsx \
  apps/web/src/pages/InboxPage.tsx \
  apps/web/src/features/inbox/MailboxPanel.tsx \
  apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Promote the inbox summary and mailbox shell in mail list

This refactor swaps the old equal-weight four-panel layout for the approved
mail-list shell: a lightweight summary strip on top, a reduced mailbox nav,
and a dedicated reading workspace below.

Constraint: The redesign must reuse the existing /mail/list route and mailbox creation dialog behavior
Rejected: Keep the outbound composer as a fourth always-visible panel | steals space from the message-reading flow
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Keep mailbox navigation visually secondary to the message list and detail panes
Tested: Targeted Vitest integration, targeted Playwright smoke
Not-tested: Full web test suite, manual responsive QA
EOF
```

### Task 3: Make the message list extraction-first and the detail pane task-first

**Files:**
- Create: `apps/web/src/features/inbox/InboxMessageRow.tsx`
- Modify: `apps/web/src/features/inbox/view-models.ts:1-15`
- Modify: `apps/web/src/features/inbox/MessageStreamPanel.tsx:1-46`
- Modify: `apps/web/src/features/inbox/MessageDetailPanel.tsx:1-54`
- Modify: `apps/web/src/test/integration/inbox-page.test.tsx`
- Modify: `apps/web/src/shared/styles/index.css`

**Step 1: Extend the integration test to lock extraction-first rendering and filter behavior**

Add this second test to `apps/web/src/test/integration/inbox-page.test.tsx`:

```tsx
import userEvent from "@testing-library/user-event";

it("lets QA focus on extraction chips before subject lines and filter to code-only messages", async () => {
  const user = userEvent.setup();
  render(<App />);

  await screen.findByText("482913");
  expect(screen.getByText(/LOGIN LINK/i)).toBeInTheDocument();
  expect(screen.getByText(/未提取/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /^仅看验证码$/i }));

  expect(screen.getByText("482913")).toBeInTheDocument();
  expect(screen.queryByText(/LOGIN LINK/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/未提取/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^复制验证码$/i })).toBeInTheDocument();
});
```

Before running it, extend the mocked `/api/messages` response with a third message whose extraction type is `none` so the filter can prove itself.

**Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
```

Expected: FAIL because the current list still renders subject-first rows and has no filter buttons.

**Step 3: Create a reusable list-row component and list/detail view-models**

Update `apps/web/src/features/inbox/view-models.ts` to export both list and detail view models:

```ts
import type { MessageSummary } from "@wemail/shared";

import { formatAttachmentSize, formatReceivedAt } from "./formatters";

function toExtractionChip(message: MessageSummary) {
  if (message.extraction.type === "auth_code" && message.extraction.value.trim()) {
    return { tone: "code", primary: message.extraction.value, secondary: "已提取验证码" };
  }

  if (["auth_link", "service_link", "subscription_link", "other_link"].includes(message.extraction.type)) {
    return { tone: "link", primary: "LOGIN LINK", secondary: message.extraction.label || "已识别链接" };
  }

  return { tone: "muted", primary: "未提取", secondary: message.previewText || "未识别到验证码或链接" };
}

export function toMessageListItemViewModel(message: MessageSummary) {
  return {
    id: message.id,
    subject: message.subject,
    fromAddress: message.fromAddress,
    receivedAtLabel: formatReceivedAt(message.receivedAt),
    attachmentCount: message.attachmentCount,
    extractionChip: toExtractionChip(message)
  };
}

export function toMessageDetailViewModel(message: MessageSummary | null) {
  if (!message) return null;

  return {
    ...message,
    receivedAtLabel: formatReceivedAt(message.receivedAt),
    extractionChip: toExtractionChip(message),
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      sizeLabel: formatAttachmentSize(attachment.size)
    }))
  };
}
```

Create `apps/web/src/features/inbox/InboxMessageRow.tsx`:

```tsx
import type { MessageSummary } from "@wemail/shared";

import { toMessageListItemViewModel } from "./view-models";

type InboxMessageRowProps = {
  message: MessageSummary;
  active: boolean;
  onSelectMessage: (messageId: string) => void;
};

export function InboxMessageRow({ message, active, onSelectMessage }: InboxMessageRowProps) {
  const viewModel = toMessageListItemViewModel(message);

  return (
    <button className={active ? "message-item active" : "message-item"} onClick={() => onSelectMessage(message.id)} type="button">
      <div className="message-item-top">
        <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>{viewModel.extractionChip.primary}</span>
        <small>{viewModel.receivedAtLabel}</small>
      </div>
      <strong>{viewModel.fromAddress}</strong>
      <span>{viewModel.subject}</span>
      <div className="message-item-meta">
        <small>{viewModel.extractionChip.secondary}</small>
        {viewModel.attachmentCount > 0 ? <small>附件 {viewModel.attachmentCount}</small> : null}
      </div>
    </button>
  );
}
```

**Step 4: Rebuild the list and detail panels around that shared extraction language**

Update `apps/web/src/features/inbox/MessageStreamPanel.tsx` to:

```tsx
import { useMemo, useState } from "react";
import type { MessageSummary } from "@wemail/shared";

import { InboxMessageRow } from "./InboxMessageRow";

type MessageFilter = "all" | "code" | "link";

function filterMessages(messages: MessageSummary[], filter: MessageFilter) {
  if (filter === "code") return messages.filter((message) => message.extraction.type === "auth_code");
  if (filter === "link") return messages.filter((message) => message.extraction.type !== "auth_code" && message.extraction.type !== "none");
  return messages;
}

export function MessageStreamPanel({ messages, selectedMessageId, onSelectMessage, onRefreshMessages }: MessageStreamPanelProps) {
  const [filter, setFilter] = useState<MessageFilter>("all");
  const visibleMessages = useMemo(() => filterMessages(messages, filter), [messages, filter]);

  return (
    <section className="panel workspace-card inbox-panel">
      <div className="panel-header workspace-card-header">
        <div>
          <p className="panel-kicker">消息流</p>
          <h2>消息列表</h2>
        </div>
        <button className="workspace-action-button ghost" onClick={onRefreshMessages} type="button">
          刷新
        </button>
      </div>
      <div className="message-filter-row" role="toolbar" aria-label="消息快速筛选">
        <button className="workspace-action-button ghost" aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">全部</button>
        <button className="workspace-action-button ghost" aria-pressed={filter === "code"} onClick={() => setFilter("code")} type="button">仅看验证码</button>
        <button className="workspace-action-button ghost" aria-pressed={filter === "link"} onClick={() => setFilter("link")} type="button">仅看链接</button>
      </div>
      <div className="message-list workspace-stack-list">
        {visibleMessages.map((message) => (
          <InboxMessageRow
            key={message.id}
            active={message.id === selectedMessageId}
            message={message}
            onSelectMessage={onSelectMessage}
          />
        ))}
        {visibleMessages.length === 0 ? <p className="empty-state">当前筛选下没有消息，切换筛选或等待新邮件到达。</p> : null}
      </div>
    </section>
  );
}
```

Update `apps/web/src/features/inbox/MessageDetailPanel.tsx` to:

```tsx
export function MessageDetailPanel({ selectedMessage }: MessageDetailPanelProps) {
  const viewModel = toMessageDetailViewModel(selectedMessage);

  if (!viewModel) {
    return (
      <section className="panel workspace-card detail-panel">
        <div className="panel-header workspace-card-header detail-panel-header">
          <div>
            <p className="panel-kicker">消息详情</p>
            <h2>请选择一封消息</h2>
          </div>
        </div>
        <p className="empty-state">请选择邮箱和消息，以查看验证码、正文和调试信息。</p>
      </section>
    );
  }

  return (
    <section className="panel workspace-card detail-panel">
      <div className="detail-panel-hero">
        <div>
          <p className="panel-kicker">消息详情</p>
          <h2>{viewModel.subject}</h2>
        </div>
        <span className={`message-extraction-chip ${viewModel.extractionChip.tone}`}>{viewModel.extractionChip.primary}</span>
        <div className="detail-panel-actions">
          <button className="workspace-action-button primary" onClick={() => navigator.clipboard.writeText(viewModel.extraction.value)} type="button">
            复制验证码
          </button>
          <a className="workspace-action-button secondary" href={`/api/messages/${viewModel.id}`} rel="noreferrer" target="_blank">
            打开原始邮件
          </a>
          <a className="workspace-action-button ghost" href={`/api/messages/${viewModel.id}`} rel="noreferrer" target="_blank">
            查看提取 JSON
          </a>
        </div>
      </div>
      <div className="detail-meta workspace-meta-row">
        <span>发件人：{viewModel.fromAddress}</span>
        <span>{viewModel.receivedAtLabel}</span>
      </div>
      {/* keep oversize warning, body, and attachments below */}
    </section>
  );
}
```

Add CSS for `.message-extraction-chip`, `.message-item-top`, `.message-filter-row`, `.detail-panel-hero`, and `.detail-panel-actions` in `apps/web/src/shared/styles/index.css`.

**Step 5: Run the integration test again and commit once the list/detail hierarchy passes**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
```

Expected: PASS with both inbox integration tests green.

Then commit:

```bash
git add \
  apps/web/src/features/inbox/InboxMessageRow.tsx \
  apps/web/src/features/inbox/view-models.ts \
  apps/web/src/features/inbox/MessageStreamPanel.tsx \
  apps/web/src/features/inbox/MessageDetailPanel.tsx \
  apps/web/src/test/integration/inbox-page.test.tsx \
  apps/web/src/shared/styles/index.css

git commit -F - <<'EOF'
Make message extraction the first-class browsing signal

The redesigned mail list only works if QA users see codes and links before
subjects, then land in a detail panel that starts with the task instead of
forcing them to read the body first.

Constraint: Keep using the current MessageSummary payload without backend shape changes
Rejected: Keep subject-first rows and only restyle the detail panel | does not solve the scan-speed problem
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Preserve the shared extraction chip language between the list and the detail hero
Tested: Targeted Vitest integration
Not-tested: Playwright smoke, full web suite, manual clipboard behavior
EOF
```

### Task 4: Move outbound mail behind a drawer, finish responsive styling, and run full verification

**Files:**
- Modify: `apps/web/src/features/inbox/OutboundPanel.tsx:1-52`
- Modify: `apps/web/src/pages/InboxPage.tsx:1-130`
- Modify: `apps/web/src/shared/styles/index.css:1193-1213,2105-2122,3139-3218`
- Modify: `apps/web/e2e/smoke.spec.ts`

**Step 1: Update the integration test to prove the drawer is closed by default and opens on demand**

Extend `apps/web/src/test/integration/inbox-page.test.tsx` with this third test:

```tsx
it("keeps outbound actions in a drawer that opens only when requested", async () => {
  const user = userEvent.setup();
  render(<App />);

  await screen.findByRole("button", { name: /^发送测试邮件$/i });
  expect(screen.queryByRole("dialog", { name: /^发送测试邮件$/i })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /^发送测试邮件$/i }));

  const dialog = await screen.findByRole("dialog", { name: /^发送测试邮件$/i });
  expect(within(dialog).getByLabelText(/收件人/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/首次外发后，记录会显示在这里/i)).toBeInTheDocument();
});
```

**Step 2: Run the integration test to verify it fails**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
```

Expected: FAIL because `OutboundPanel` is still a grid section, not a dialog/drawer.

**Step 3: Convert `OutboundPanel` into a right-side drawer**

Rewrite `apps/web/src/features/inbox/OutboundPanel.tsx` to this shape:

```tsx
import type { FormEvent } from "react";
import { X } from "lucide-react";

import type { OutboundHistoryItem } from "./types";

type OutboundPanelProps = {
  open: boolean;
  selectedMailboxId: string | null;
  outboundHistory: OutboundHistoryItem[];
  onClose: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundPanel({ open, selectedMailboxId, outboundHistory, onClose, onSendMail }: OutboundPanelProps) {
  if (!open) return null;

  return (
    <div className="workspace-drawer-backdrop" role="presentation">
      <section aria-labelledby="send-mail-drawer-title" aria-modal="true" className="workspace-drawer panel composer-panel" role="dialog">
        <div className="workspace-dialog-header">
          <div>
            <p className="panel-kicker">外发通道</p>
            <h2 id="send-mail-drawer-title">发送测试邮件</h2>
          </div>
          <button className="workspace-theme-toggle" onClick={onClose} type="button" aria-label="关闭发送测试邮件抽屉">
            <X absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
          </button>
        </div>
        <form className="composer-form outbound-form" onSubmit={onSendMail}>
          <label>
            收件人
            <input name="toAddress" type="email" required />
          </label>
          <label>
            主题
            <input name="subject" required />
          </label>
          <label>
            正文
            <textarea name="bodyText" rows={6} required />
          </label>
          <button className="workspace-action-button primary" type="submit" disabled={!selectedMailboxId}>
            发送邮件
          </button>
        </form>
        <div className="history-list workspace-stack-list">
          {outboundHistory.map((item) => (
            <div key={item.id} className="history-item">
              <strong>{item.subject}</strong>
              <span>{item.toAddress}</span>
              <small>{item.status}</small>
            </div>
          ))}
          {outboundHistory.length === 0 ? <p className="empty-state">首次外发后，记录会显示在这里。</p> : null}
        </div>
      </section>
    </div>
  );
}
```

Then add drawer CSS next to the existing dialog rules:

```css
.workspace-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: flex;
  justify-content: flex-end;
  padding: 24px;
  background: rgba(3, 3, 3, 0.48);
  backdrop-filter: blur(10px);
}

.workspace-drawer {
  width: min(460px, 100%);
  max-height: 100%;
  overflow: auto;
}
```

Keep the mailbox-creation dialog rules intact.

**Step 4: Run the targeted checks, then the full workspace verification stack**

Run:

```bash
pnpm --dir apps/web exec vitest run src/test/integration/inbox-page.test.tsx
pnpm exec playwright test -c apps/web/playwright.config.ts --grep "shows the reworked shared access shell"
pnpm test:web
pnpm lint
pnpm typecheck
pnpm test:e2e
```

Expected: PASS on all commands. If `pnpm test:e2e` fails only because the browser is missing, run `pnpm test:e2e:install` once, then rerun `pnpm test:e2e`.

**Step 5: Commit the drawer refactor and final verification**

```bash
git add \
  apps/web/src/features/inbox/OutboundPanel.tsx \
  apps/web/src/pages/InboxPage.tsx \
  apps/web/src/shared/styles/index.css \
  apps/web/e2e/smoke.spec.ts

git commit -F - <<'EOF'
Tuck outbound actions behind a drawer in the mail workspace

The mail list is now optimized for reading and extraction, so outbound work
moves into an on-demand drawer that preserves the task flow while keeping the
send form one click away.

Constraint: Outbound sending must keep using the existing sendMail form handler and history payload
Rejected: Remove outbound from /mail/list entirely | breaks the approved first-pass scope and current workflow
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Do not let the outbound drawer become a permanent fourth column again
Tested: Targeted Vitest integration, targeted Playwright smoke, pnpm test:web, pnpm lint, pnpm typecheck, pnpm test:e2e
Not-tested: Manual browser QA outside automated coverage
EOF
```
