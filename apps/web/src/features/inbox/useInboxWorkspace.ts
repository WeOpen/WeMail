import { FormEvent, useCallback, useMemo } from "react";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import { createMailboxAction, sendOutboundAction } from "./actions";
import { queryMailboxes, queryMessages, queryOutboundHistory } from "./queries";
import { selectMessage } from "./selectors";

type UseInboxWorkspaceOptions = {
  enabled: boolean;
  onToast: (toast: WemailToastInput) => void;
};

export function useInboxWorkspace({ enabled, onToast }: UseInboxWorkspaceOptions) {
  const mailboxes = useAppStore((state) => state.mailboxes);
  const selectedMailboxId = useAppStore((state) => state.selectedMailboxId);
  const messages = useAppStore((state) => state.messages);
  const selectedMessageId = useAppStore((state) => state.selectedMessageId);
  const outboundHistory = useAppStore((state) => state.outboundHistory);
  const setMailboxes = useAppStore((state) => state.setMailboxes);
  const setSelectedMailboxId = useAppStore((state) => state.setSelectedMailboxId);
  const setMessages = useAppStore((state) => state.setMessages);
  const setSelectedMessageId = useAppStore((state) => state.setSelectedMessageId);
  const setOutboundHistory = useAppStore((state) => state.setOutboundHistory);

  const selectedMessage = useMemo(() => selectMessage(messages, selectedMessageId), [messages, selectedMessageId]);

  const refreshMailboxes = useCallback(
    async (nextSelectedMailboxId?: string | null) => {
      if (!enabled) return;
      const nextMailboxes = await queryMailboxes();
      setMailboxes(nextMailboxes, nextSelectedMailboxId);
    },
    [enabled, setMailboxes]
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
    [selectedMailboxId, setMessages, setSelectedMessageId]
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
    [selectedMailboxId, setOutboundHistory]
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
