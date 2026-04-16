import { FormEvent, useCallback, useMemo, useState } from "react";

import type { MailboxSummary, MessageSummary } from "@wemail/shared";

import type { WemailToastInput } from "../../shared/toast";
import { createMailboxAction, sendOutboundAction } from "./actions";
import { pickNextMailboxId, queryMailboxes, queryMessages, queryOutboundHistory } from "./queries";
import { selectMessage } from "./selectors";
import type { OutboundHistoryItem } from "./types";

type UseInboxWorkspaceOptions = {
  enabled: boolean;
  onToast: (toast: WemailToastInput) => void;
};

export function useInboxWorkspace({ enabled, onToast }: UseInboxWorkspaceOptions) {
  const [mailboxes, setMailboxes] = useState<MailboxSummary[]>([]);
  const [selectedMailboxId, setSelectedMailboxId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [outboundHistory, setOutboundHistory] = useState<OutboundHistoryItem[]>([]);

  const selectedMessage = useMemo(() => selectMessage(messages, selectedMessageId), [messages, selectedMessageId]);

  const refreshMailboxes = useCallback(
    async (nextSelectedMailboxId?: string | null) => {
      if (!enabled) return;
      const nextMailboxes = await queryMailboxes();
      setMailboxes(nextMailboxes);
      setSelectedMailboxId(pickNextMailboxId(nextMailboxes, nextSelectedMailboxId));
    },
    [enabled]
  );

  const refreshMessages = useCallback(
    async (nextMailboxId?: string | null) => {
      const mailboxId = nextMailboxId ?? selectedMailboxId;
      if (!mailboxId) {
        setMessages([]);
        setSelectedMessageId(null);
        return;
      }
      const nextMessages = await queryMessages(mailboxId);
      setMessages(nextMessages);
      setSelectedMessageId(nextMessages[0]?.id ?? null);
    },
    [selectedMailboxId]
  );

  const refreshOutbound = useCallback(
    async (nextMailboxId?: string | null) => {
      const mailboxId = nextMailboxId ?? selectedMailboxId;
      if (!mailboxId) {
        setOutboundHistory([]);
        return;
      }
      setOutboundHistory(await queryOutboundHistory(mailboxId));
    },
    [selectedMailboxId]
  );

  const createMailbox = useCallback(
    async (label: string) => {
      const payload = await createMailboxAction(label);
      await refreshMailboxes(payload.mailbox.id);
      onToast({ message: `邮箱 ${payload.mailbox.address} 已创建。`, tone: "success" });
    },
    [onToast, refreshMailboxes]
  );

  const sendMail = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedMailboxId) return;
      const form = new FormData(event.currentTarget);
      await sendOutboundAction({
        mailboxId: selectedMailboxId,
        toAddress: form.get("toAddress"),
        subject: form.get("subject"),
        bodyText: form.get("bodyText")
      });
      event.currentTarget.reset();
      onToast({ message: "邮件已发送。", tone: "success" });
      await refreshOutbound(selectedMailboxId);
    },
    [onToast, refreshOutbound, selectedMailboxId]
  );

  return {
    mailboxes,
    selectedMailboxId,
    setSelectedMailboxId,
    messages,
    selectedMessageId,
    setSelectedMessageId,
    selectedMessage,
    outboundHistory,
    refreshMailboxes,
    refreshMessages,
    refreshOutbound,
    createMailbox,
    sendMail
  };
}