import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MailDomainSummary, MessageFilter, MessageListSummary } from "@wemail/shared";

import { useAppStore } from "../../app/appStore";
import type { WemailToastInput } from "../../shared/toast";
import { createMailboxAction, sendOutboundAction } from "./actions";
import {
  fetchMailboxDomains,
  fetchMailboxPolicy,
  type MailboxCreatePayload,
  type MailboxListQueryInput,
  type MessageListQueryInput,
  type OutboundListQueryInput
} from "./api";
import {
  queryMailboxOptions,
  queryMailboxes,
  queryMessageDetail,
  queryMessages,
  queryOutboundDetail,
  queryOutboundHistory
} from "./queries";
import { selectMessage } from "./selectors";

type UseInboxWorkspaceOptions = {
  enabled: boolean;
  loadMailboxCreationOptions?: boolean;
  loadSelectedMessageDetail?: boolean;
  onToast: (toast: WemailToastInput) => void;
};

const defaultMessageListSummary: MessageListSummary = {
  messageCount: 0,
  extractionCount: 0,
  attachmentCount: 0
};

const defaultOutboundSummary = {
  totalCount: 0,
  sentCount: 0,
  failedCount: 0
};

function normalizeMessageQuery(
  query: MessageListQueryInput | string | null | undefined,
  selectedMailboxId: string | null
): MessageListQueryInput {
  if (typeof query === "string" || query === null) {
    return {
      mailboxId: query,
      page: 1,
      pageSize: 10,
      filter: "all" satisfies MessageFilter
    };
  }

  return {
    mailboxId: typeof query?.mailboxId === "undefined" ? selectedMailboxId : query.mailboxId,
    page: query?.page ?? 1,
    pageSize: query?.pageSize ?? 10,
    filter: query?.filter ?? "all",
    ...(query?.search ? { search: query.search } : {})
  };
}

export function useInboxWorkspace({
  enabled,
  loadMailboxCreationOptions = true,
  loadSelectedMessageDetail = true,
  onToast
}: UseInboxWorkspaceOptions) {
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
  const [availableMailboxDomains, setAvailableMailboxDomains] = useState<MailDomainSummary[]>([]);
  const [isLoadingMailboxDomains, setIsLoadingMailboxDomains] = useState(false);
  const [requireMailboxCreatorNote, setRequireMailboxCreatorNote] = useState(false);
  const [messageListTotal, setMessageListTotal] = useState(0);
  const [messageListPage, setMessageListPage] = useState(1);
  const [messageListPageSize, setMessageListPageSize] = useState(10);
  const [messageListSummary, setMessageListSummary] = useState<MessageListSummary>(defaultMessageListSummary);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageListError, setMessageListError] = useState<string | null>(null);
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<ReturnType<typeof selectMessage>>(null);
  const [isLoadingSelectedMessage, setIsLoadingSelectedMessage] = useState(false);
  const [selectedMessageError, setSelectedMessageError] = useState<string | null>(null);
  const [outboundTotal, setOutboundTotal] = useState(0);
  const [outboundPage, setOutboundPage] = useState(1);
  const [outboundPageSize, setOutboundPageSize] = useState(6);
  const [outboundSummary, setOutboundSummary] = useState(defaultOutboundSummary);
  const [isLoadingOutbound, setIsLoadingOutbound] = useState(false);
  const [outboundError, setOutboundError] = useState<string | null>(null);
  const messagesRequestIdRef = useRef(0);
  const messageDetailRequestIdRef = useRef(0);
  const selectedMessageIdRef = useRef<string | null>(selectedMessageId);

  const selectedMessageFromList = useMemo(() => selectMessage(messages, selectedMessageId), [messages, selectedMessageId]);
  const selectedMessage = selectedMessageDetail ?? selectedMessageFromList;

  useEffect(() => {
    selectedMessageIdRef.current = selectedMessageId;
  }, [selectedMessageId]);

  const refreshMailboxes = useCallback(
    async (nextSelectedMailboxId?: string | null) => {
      if (!enabled) return;
      const nextMailboxes = await queryMailboxes();
      setMailboxes(nextMailboxes, nextSelectedMailboxId);
    },
    [enabled, setMailboxes]
  );

  const refreshMessages = useCallback(
    async (query?: MessageListQueryInput | string | null) => {
      const requestId = messagesRequestIdRef.current + 1;
      messagesRequestIdRef.current = requestId;
      setIsLoadingMessages(true);

      try {
        const result = await queryMessages(normalizeMessageQuery(query, selectedMailboxId));
        if (messagesRequestIdRef.current !== requestId) return;
        const previousSelectedMessageId = selectedMessageIdRef.current;
        const nextSelectedMessageId = result.messages.some((message) => message.id === previousSelectedMessageId)
          ? previousSelectedMessageId
          : result.messages[0]?.id ?? null;

        setMessages(result.messages);
        setSelectedMessageId(nextSelectedMessageId);
        selectedMessageIdRef.current = nextSelectedMessageId;
        setMessageListTotal(result.total);
        setMessageListPage(result.page);
        setMessageListPageSize(result.pageSize);
        setMessageListSummary(result.summary);
        setMessageListError(null);
      } catch (error) {
        if (messagesRequestIdRef.current !== requestId) return;
        setMessageListError(error instanceof Error ? error.message : "邮件列表加载失败");
      } finally {
        if (messagesRequestIdRef.current === requestId) setIsLoadingMessages(false);
      }
    },
    [selectedMailboxId, setMessages, setSelectedMessageId]
  );

  const refreshSelectedMessage = useCallback(async (messageId?: string | null) => {
    const requestId = messageDetailRequestIdRef.current + 1;
    messageDetailRequestIdRef.current = requestId;

    if (!messageId) {
      setSelectedMessageDetail(null);
      setSelectedMessageError(null);
      setIsLoadingSelectedMessage(false);
      return;
    }

    setIsLoadingSelectedMessage(true);
    try {
      const message = await queryMessageDetail(messageId);
      if (messageDetailRequestIdRef.current !== requestId) return;
      setSelectedMessageDetail(message);
      setSelectedMessageError(null);
    } catch (error) {
      if (messageDetailRequestIdRef.current !== requestId) return;
      setSelectedMessageDetail(null);
      setSelectedMessageError(error instanceof Error ? error.message : "邮件详情加载失败");
    } finally {
      if (messageDetailRequestIdRef.current === requestId) setIsLoadingSelectedMessage(false);
    }
  }, []);

  const refreshMailboxOptions = useCallback((query: MailboxListQueryInput) => {
    return queryMailboxOptions(query);
  }, []);

  const refreshOutbound = useCallback(
    async (query?: string | OutboundListQueryInput | null) => {
      const mailboxId =
        typeof query === "string" || query === null
          ? query
          : typeof query?.mailboxId === "undefined"
            ? selectedMailboxId
            : query.mailboxId;
      if (!mailboxId) {
        setOutboundHistory([]);
        setOutboundTotal(0);
        setOutboundPage(1);
        setOutboundPageSize(6);
        setOutboundSummary(defaultOutboundSummary);
        setOutboundError(null);
        return;
      }
      setIsLoadingOutbound(true);
      try {
        const result = await queryOutboundHistory(
          typeof query === "object" && query !== null
            ? { ...query, mailboxId }
            : { mailboxId, page: 1, pageSize: 6, status: "all" }
        );
        setOutboundHistory(result.messages);
        setOutboundTotal(result.total);
        setOutboundPage(result.page);
        setOutboundPageSize(result.pageSize);
        setOutboundSummary(result.summary);
        setOutboundError(null);
      } catch (error) {
        setOutboundError(error instanceof Error ? error.message : "发件记录加载失败");
      } finally {
        setIsLoadingOutbound(false);
      }
    },
    [selectedMailboxId, setOutboundHistory]
  );

  const loadOutboundDetail = useCallback((messageId: string) => {
    return queryOutboundDetail(messageId);
  }, []);

  const refreshMailboxCreationOptions = useCallback(async () => {
    if (!enabled) return;

    setIsLoadingMailboxDomains(true);
    try {
      const domainsPayload = await fetchMailboxDomains();
      setAvailableMailboxDomains(Array.isArray(domainsPayload.domains) ? domainsPayload.domains : []);
    } catch {
      setAvailableMailboxDomains([]);
    }

    try {
      const policyPayload = await fetchMailboxPolicy();
      setRequireMailboxCreatorNote(Boolean(policyPayload.policy?.creation.requireCreatorNote));
    } catch {
      setRequireMailboxCreatorNote(false);
    } finally {
      setIsLoadingMailboxDomains(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!loadMailboxCreationOptions) return;
    void refreshMailboxCreationOptions();
  }, [loadMailboxCreationOptions, refreshMailboxCreationOptions]);

  useEffect(() => {
    if (!enabled || !loadSelectedMessageDetail) return;
    void refreshSelectedMessage(selectedMessageId);
  }, [enabled, loadSelectedMessageDetail, refreshSelectedMessage, selectedMessageId]);

  const createMailbox = useCallback(
    async (input: MailboxCreatePayload) => {
      const payload = await createMailboxAction(input);
      await refreshMailboxes(payload.mailbox.id);
      onToast({ message: `邮箱 ${payload.mailbox.address} 已创建。`, tone: "success" });
    },
    [onToast, refreshMailboxes]
  );

  const sendMail = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const outboundMailboxId = selectedMailboxId ?? mailboxes[0]?.id ?? null;
      if (!outboundMailboxId) return;
      const form = new FormData(event.currentTarget);
      await sendOutboundAction({
        mailboxId: outboundMailboxId,
        toAddress: form.get("toAddress"),
        subject: form.get("subject"),
        bodyText: form.get("bodyText")
      });
      event.currentTarget.reset();
      onToast({ message: "邮件已发送。", tone: "success" });
      await refreshOutbound({ mailboxId: outboundMailboxId, page: 1, pageSize: outboundPageSize, status: "all" });
    },
    [mailboxes, onToast, outboundPageSize, refreshOutbound, selectedMailboxId]
  );

  return {
    mailboxes,
    selectedMailboxId,
    setSelectedMailboxId,
    messages,
    isLoadingMessages,
    messageListError,
    messageListPage,
    messageListPageSize,
    messageListSummary,
    messageListTotal,
    selectedMessageId,
    setSelectedMessageId,
    selectedMessage,
    isLoadingSelectedMessage,
    selectedMessageError,
    outboundHistory,
    outboundTotal,
    outboundPage,
    outboundPageSize,
    outboundSummary,
    isLoadingOutbound,
    outboundError,
    availableMailboxDomains,
    isLoadingMailboxDomains,
    requireMailboxCreatorNote,
    refreshMailboxes,
    refreshMailboxOptions,
    refreshMessages,
    refreshSelectedMessage,
    refreshOutbound,
    loadOutboundDetail,
    refreshMailboxCreationOptions,
    createMailbox,
    sendMail
  };
}
