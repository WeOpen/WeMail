import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { MailboxSummary, MessageSummary } from "@wemail/shared";

import { InboxSummaryBar } from "../features/inbox/InboxSummaryBar";
import { MailboxPanel } from "../features/inbox/MailboxPanel";
import { MessageDetailPanel } from "../features/inbox/MessageDetailPanel";
import { MessageStreamPanel } from "../features/inbox/MessageStreamPanel";
import { OutboundPanel } from "../features/inbox/OutboundPanel";
import type { OutboundHistoryItem } from "../features/inbox/types";
import { Button } from "../shared/button";
import { FormField, TextInput } from "../shared/form";
import { OverlayDialog } from "../shared/overlay";

type InboxPageProps = {
  mailboxes: MailboxSummary[];
  selectedMailboxId: string | null;
  messages: MessageSummary[];
  selectedMessageId: string | null;
  selectedMessage: MessageSummary | null;
  outboundHistory: OutboundHistoryItem[];
  mailboxComposerOpen: boolean;
  onCloseMailboxComposer: () => void;
  onCreateMailbox: (label: string) => Promise<void>;
  onOpenMailboxComposer: () => void;
  onSelectMailbox: (mailboxId: string) => void;
  onSelectMessage: (messageId: string) => void;
  onRefreshMessages: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function InboxPage({
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
}: InboxPageProps) {
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outboundDrawerOpen, setOutboundDrawerOpen] = useState(false);

  const suggestedLabel = useMemo(() => `Mailbox ${mailboxes.length + 1}`, [mailboxes.length]);
  const selectedMailbox = useMemo(
    () => mailboxes.find((mailbox) => mailbox.id === selectedMailboxId) ?? null,
    [mailboxes, selectedMailboxId]
  );
  const extractionCount = useMemo(
    () => messages.filter((message) => message.extraction.type !== "none" && message.extraction.value.trim().length > 0).length,
    [messages]
  );
  const attachmentCount = useMemo(() => messages.reduce((sum, message) => sum + message.attachmentCount, 0), [messages]);

  useEffect(() => {
    if (mailboxComposerOpen) {
      setLabel(suggestedLabel);
      setIsSubmitting(false);
    }
  }, [mailboxComposerOpen, suggestedLabel]);

  const handleCreateMailbox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextLabel = label.trim();
    if (!nextLabel) return;

    setIsSubmitting(true);
    await onCreateMailbox(nextLabel);
    setLabel("");
    setIsSubmitting(false);
  };

  return (
    <>
      <main className="workspace-grid inbox-page-grid">
        <InboxSummaryBar
          attachmentCount={attachmentCount}
          extractionCount={extractionCount}
          messageCount={messages.length}
          onOpenMailboxComposer={onOpenMailboxComposer}
          onOpenOutboundDrawer={() => setOutboundDrawerOpen(true)}
          selectedMailbox={selectedMailbox}
        />
        <div className="workspace-grid inbox-grid">
          <MailboxPanel
            mailboxes={mailboxes}
            selectedMailboxId={selectedMailboxId}
            onOpenMailboxComposer={onOpenMailboxComposer}
            onSelectMailbox={onSelectMailbox}
          />
          <MessageStreamPanel
            messages={messages}
            selectedMessageId={selectedMessageId}
            onRefreshMessages={onRefreshMessages}
            onSelectMessage={onSelectMessage}
          />
          <MessageDetailPanel selectedMessage={selectedMessage} />
        </div>
      </main>
      <OutboundPanel
        open={outboundDrawerOpen}
        outboundHistory={outboundHistory}
        selectedMailboxId={selectedMailboxId}
        onClose={() => setOutboundDrawerOpen(false)}
        onSendMail={onSendMail}
      />

      {mailboxComposerOpen ? (
        <OverlayDialog
          closeLabel="关闭邮箱创建对话框"
          description="给邮箱填写一个简短标签，地址仍会通过现有后端流程创建。"
          eyebrow="创建邮箱"
          onClose={onCloseMailboxComposer}
          title="创建新的收件入口"
        >
          <form className="composer-form workspace-dialog-form" onSubmit={(event) => void handleCreateMailbox(event)}>
            <FormField label="邮箱标签" required>
              <TextInput
                autoFocus
                name="mailboxLabel"
                onChange={(event) => setLabel(event.target.value)}
                placeholder="运营邮箱"
                required
                value={label}
              />
            </FormField>
            <div className="workspace-dialog-actions">
              <Button onClick={onCloseMailboxComposer} variant="secondary">
                取消
              </Button>
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {isSubmitting ? "创建中…" : "创建邮箱"}
              </Button>
            </div>
          </form>
        </OverlayDialog>
      ) : null}
    </>
  );
}
