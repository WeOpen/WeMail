import { afterEach, describe, expect, it } from "vitest";

import type { DictionaryCatalogGroup, MailboxSummary, MessageSummary, SessionSummary } from "@wemail/shared";

import { resetAppStore, useAppStore } from "../app/appStore";

const session: SessionSummary = {
  user: {
    id: "user-1",
    email: "member@example.com",
    name: "Member User",
    role: "member",
    status: "active",
    createdAt: "2026-04-08T00:00:00.000Z",
    updatedAt: "2026-04-08T00:00:00.000Z"
  },
  featureToggles: {
    aiEnabled: true,
    telegramEnabled: true,
    outboundEnabled: true,
    mailboxCreationEnabled: true
  }
};

const mailboxes: MailboxSummary[] = [
  {
    id: "box-1",
    address: "qa-signup@example.com",
    label: "QA Signup",
    createdAt: "2026-04-08T00:00:00.000Z"
  }
];

const messages: MessageSummary[] = [
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
  }
];

const dictionaries: DictionaryCatalogGroup[] = [
  {
    groupKey: "user.role",
    label: "用户角色",
    description: "控制权限边界的系统角色。",
    isSystem: true,
    version: 1,
    items: [
      {
        groupKey: "user.role",
        value: "admin",
        label: "管理员",
        description: null,
        sortOrder: 10,
        enabled: true,
        metadata: {}
      }
    ]
  }
];

describe("app zustand store", () => {
  afterEach(() => {
    resetAppStore();
  });

  it("stores shared session and toast state outside component-local state", () => {
    useAppStore.getState().setSession(session);
    useAppStore.getState().setLoadingSession(false);
    useAppStore.getState().pushToast({ message: "登录成功。", tone: "success" });

    expect(useAppStore.getState().session).toEqual(session);
    expect(useAppStore.getState().loadingSession).toBe(false);
    expect(useAppStore.getState().toasts).toHaveLength(1);

    const [toast] = useAppStore.getState().toasts;
    useAppStore.getState().dismissToast(toast.id);

    expect(useAppStore.getState().toasts).toEqual([]);
  });

  it("keeps theme preference and workspace selection in resettable shared state", () => {
    useAppStore.getState().setThemePreference("light");
    useAppStore.getState().setSystemTheme("dark");
    useAppStore.getState().setMailboxComposerOpen(true);
    useAppStore.getState().setMailboxes(mailboxes, "box-1");
    useAppStore.getState().setMessages(messages);

    expect(useAppStore.getState().themePreference).toBe("light");
    expect(useAppStore.getState().systemTheme).toBe("dark");
    expect(useAppStore.getState().mailboxComposerOpen).toBe(true);
    expect(useAppStore.getState().selectedMailboxId).toBe("box-1");
    expect(useAppStore.getState().selectedMessageId).toBe("msg-1");

    resetAppStore();

    expect(useAppStore.getState().session).toBeNull();
    expect(useAppStore.getState().themePreference).toBe("system");
    expect(useAppStore.getState().mailboxComposerOpen).toBe(false);
    expect(useAppStore.getState().mailboxes).toEqual([]);
    expect(useAppStore.getState().messages).toEqual([]);
  });

  it("falls back to an empty telegram overview when legacy settings payloads omit it", () => {
    expect(() => {
      useAppStore.getState().setSettingsData([], undefined as never);
    }).not.toThrow();

    expect(useAppStore.getState().telegram).toBeNull();
    expect(useAppStore.getState().telegramOverview.subscription).toBeNull();
  });

  it("keeps dictionary catalog in resettable session-scoped state", () => {
    useAppStore.getState().setDictionaries(dictionaries);

    expect(useAppStore.getState().dictionaries).toEqual(dictionaries);
    expect(useAppStore.getState().dictionaryByGroup["user.role"]?.items[0]?.label).toBe("管理员");

    resetAppStore();

    expect(useAppStore.getState().dictionaries).toEqual([]);
    expect(useAppStore.getState().dictionaryByGroup).toEqual({});
  });
});
