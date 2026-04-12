import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { MailboxSummary, MessageSummary } from "@wemail/shared";

import { MailboxPanel } from "../features/inbox/MailboxPanel";
import { MessageDetailPanel } from "../features/inbox/MessageDetailPanel";
import { MessageStreamPanel } from "../features/inbox/MessageStreamPanel";
import { OutboundPanel } from "../features/inbox/OutboundPanel";
import type { OutboundHistoryItem } from "../features/inbox/types";

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

  const suggestedLabel = useMemo(() => `Mailbox ${mailboxes.length + 1}`, [mailboxes.length]);

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
      <main className="workspace-grid inbox-grid">
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
        <OutboundPanel
          outboundHistory={outboundHistory}
          selectedMailboxId={selectedMailboxId}
          onSendMail={onSendMail}
        />
      </main>

      {mailboxComposerOpen ? (
        <div className="workspace-dialog-backdrop" role="presentation">
          <section aria-labelledby="create-mailbox-title" aria-modal="true" className="workspace-dialog panel" role="dialog">
            <div className="workspace-dialog-header">
              <div>
                <p className="panel-kicker">Create mailbox</p>
                <h2 id="create-mailbox-title">Launch a new inbox surface</h2>
              </div>
              <button className="workspace-theme-toggle" onClick={onCloseMailboxComposer} type="button" aria-label="Close mailbox creator">
                ✕
              </button>
            </div>
            <p className="section-copy">
              Give the mailbox a short operator label. The address will be created through the existing backend flow.
            </p>
            <form className="composer-form workspace-dialog-form" onSubmit={(event) => void handleCreateMailbox(event)}>
              <label>
                Mailbox label
                <input
                  autoFocus
                  name="mailboxLabel"
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Ops inbox"
                  required
                  value={label}
                />
              </label>
              <div className="workspace-dialog-actions">
                <button className="workspace-action-button secondary" onClick={onCloseMailboxComposer} type="button">
                  Cancel
                </button>
                <button className="workspace-action-button primary" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Creating…" : "Create mailbox"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
