import {
  parseAccountPolicyRecord,
  type AccountCreationStatus,
  type AccountPolicy,
  type FeatureToggles,
  type MailboxStatus,
  type UserRole
} from "@wemail/shared";

import type { AppBindings, AppStore, MailboxDetailListQuery } from "../../core/bindings";
import { jsonError, recordAudit } from "../services/audit-service";
import { buildMailboxAddress } from "../services/address-service";
import { getMailDomains, getMailDomainsForRole, getMailboxLimit, normalizeMailDomain } from "../services/config-service";

type MailboxUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "mailboxCreationEnabled">;
  env: Pick<AppBindings, "DEFAULT_MAIL_DOMAIN" | "MAILBOX_LIMIT">;
};

export async function listUserMailboxes(context: MailboxUseCaseContext, userId: string) {
  return context.store.mailboxes.listByUser(userId);
}

export async function listUserMailboxesPage(
  context: MailboxUseCaseContext,
  userId: string,
  query: { page: number; pageSize: number; search?: string }
) {
  const normalizedSearch = query.search?.trim().toLowerCase();
  const page = Number.isFinite(query.page) && query.page > 0 ? Math.trunc(query.page) : 1;
  const pageSize = Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.trunc(query.pageSize), 50) : 10;
  const mailboxDetails = await Promise.all(
    (await context.store.mailboxes.listByUser(userId)).map((mailbox) => context.store.mailboxes.findDetailById(mailbox.id))
  );
  const mailboxes = mailboxDetails.filter((mailbox): mailbox is NonNullable<typeof mailbox> => {
    if (!mailbox || mailbox.status !== "enabled") return false;
    if (!normalizedSearch) return true;
    return `${mailbox.label} ${mailbox.address}`.toLowerCase().includes(normalizedSearch);
  });
  const startIndex = (page - 1) * pageSize;

  return {
    mailboxes: mailboxes.slice(startIndex, startIndex + pageSize),
    total: mailboxes.length,
    page,
    pageSize
  };
}

export async function listSelectableMailboxesPage(
  context: MailboxUseCaseContext,
  user: { id: string; role: UserRole },
  query: { page: number; pageSize: number; search?: string }
) {
  if (user.role !== "admin") return listUserMailboxesPage(context, user.id, query);

  const page = Number.isFinite(query.page) && query.page > 0 ? Math.trunc(query.page) : 1;
  const pageSize = Number.isFinite(query.pageSize) && query.pageSize > 0 ? Math.min(Math.trunc(query.pageSize), 50) : 10;
  const result = await context.store.mailboxes.listAllWithDetails({
    page,
    pageSize,
    search: query.search?.trim() || undefined,
    status: "enabled"
  });

  return {
    mailboxes: result.accounts,
    total: result.total,
    page,
    pageSize
  };
}

export async function listAllMailboxesWithDetails(
  context: MailboxUseCaseContext,
  query: MailboxDetailListQuery
) {
  return context.store.mailboxes.listAllWithDetails(query);
}

async function getAccountPolicy(context: MailboxUseCaseContext) {
  return parseAccountPolicyRecord(await context.store.accountSettings.get());
}

function parseDefaultTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function getInactiveTargetStatus(action: AccountPolicy["lifecycle"]["inactiveAction"]): MailboxStatus | null {
  switch (action) {
    case "disable":
      return "disabled";
    case "archive":
      return "archived";
    default:
      return null;
  }
}

export async function applyInactiveMailboxLifecycle(context: MailboxUseCaseContext, policy: AccountPolicy) {
  const targetStatus = getInactiveTargetStatus(policy.lifecycle.inactiveAction);
  if (!targetStatus) return;

  const pageSize = 500;
  let page = 1;
  let total = 0;

  do {
    const result = await context.store.mailboxes.listAllWithDetails({
      page,
      pageSize,
      inactiveDays: policy.lifecycle.inactiveDays,
      quickFilter: "inactive"
    });
    total = result.total;

    for (const account of result.accounts) {
      if (account.status === "soft_deleted" || account.status === targetStatus) continue;
      await context.store.mailboxes.update(account.id, { status: targetStatus });
    }

    page += 1;
  } while ((page - 1) * pageSize < total);
}

export async function listAvailableMailboxDomains(context: MailboxUseCaseContext, userId: string) {
  const user = await context.store.users.findById(userId);
  if (!user) return jsonError("User not found", 404);

  const domains = getMailDomainsForRole(await getMailDomains(context.store, context.env), user.role);

  return {
    domains,
    primaryDomain: domains[0]?.domain ?? ""
  };
}

export async function createUserMailbox(
  context: MailboxUseCaseContext,
  payload: {
    userId: string;
    label: string;
    domain?: string;
    creatorNote?: string;
    status?: AccountCreationStatus;
    tags?: string[];
  }
) {
  if (!context.featureToggles.mailboxCreationEnabled) {
    return jsonError("Mailbox creation disabled", 403);
  }

  if ((await context.store.mailboxes.countByUser(payload.userId)) >= getMailboxLimit(context.env)) {
    return jsonError("Mailbox limit reached", 403);
  }

  const user = await context.store.users.findById(payload.userId);
  if (!user) return jsonError("User not found", 404);

  const accountPolicy = await getAccountPolicy(context);
  const hasCreationOverride = typeof payload.status !== "undefined" || typeof payload.tags !== "undefined";

  if (accountPolicy.creation.requireCreatorNote && !payload.creatorNote?.trim()) {
    return jsonError("creatorNote is required", 400);
  }

  if (!accountPolicy.creation.allowCreationOverride && hasCreationOverride) {
    return jsonError("Creation overrides are disabled by account policy", 400);
  }

  const availableDomains = getMailDomainsForRole(await getMailDomains(context.store, context.env), user.role);
  if (availableDomains.length === 0) return jsonError("No mail domain is available for this role", 403);

  let selectedDomain = availableDomains[0];
  if (payload.domain) {
    const normalizedDomain = normalizeMailDomain(payload.domain);
    if (!normalizedDomain) return jsonError("Invalid mail domain", 400);

    const matchedDomain = availableDomains.find((domain) => domain.domain === normalizedDomain);
    if (!matchedDomain) return jsonError("Mail domain is not available for this role", 403);
    selectedDomain = matchedDomain;
  }

  const mailbox = await context.store.mailboxes.create({
    userId: payload.userId,
    label: payload.label,
    address: buildMailboxAddress(selectedDomain.domain, payload.label),
    status: payload.status ?? accountPolicy.creation.defaultStatus,
    tags:
      payload.tags ??
      (accountPolicy.creation.defaultTagsEnabled ? parseDefaultTags(accountPolicy.creation.defaultTags) : [])
  });

  await recordAudit(context.store, "user", payload.userId, "mailbox-create", {
    mailboxId: mailbox.id,
    domain: selectedDomain.domain,
    creatorNote: payload.creatorNote?.trim() || null
  });

  return mailbox;
}

export async function deleteUserMailbox(
  context: MailboxUseCaseContext,
  payload: { userId: string; mailboxId: string }
) {
  const mailbox = await context.store.mailboxes.findDetailById(payload.mailboxId);
  if (!mailbox || mailbox.userId !== payload.userId) return jsonError("Mailbox not found", 404);

  await context.store.mailboxes.update(payload.mailboxId, { status: "soft_deleted" });
  await recordAudit(context.store, "user", payload.userId, "mailbox-soft-delete", {
    mailboxId: payload.mailboxId
  });

  return { ok: true };
}

async function findMailboxDetailOrError(context: MailboxUseCaseContext, mailboxId: string) {
  const mailbox = await context.store.mailboxes.findDetailById(mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);
  return mailbox;
}

export async function updateMailboxAsAdmin(
  context: MailboxUseCaseContext,
  payload: { actorUserId: string; mailboxId: string; label?: string; status?: MailboxStatus }
) {
  const mailbox = await context.store.mailboxes.update(payload.mailboxId, {
    label: payload.label,
    status: payload.status
  });

  if (!mailbox) return jsonError("Mailbox not found", 404);

  await recordAudit(context.store, "user", payload.actorUserId, "mailbox-update", {
    mailboxId: payload.mailboxId,
    label: payload.label,
    status: payload.status
  });

  return mailbox;
}

export async function deleteMailboxAsAdmin(
  context: MailboxUseCaseContext,
  payload: { actorUserId: string; mailboxId: string }
) {
  const mailbox = await context.store.mailboxes.findDetailById(payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);

  await context.store.mailboxes.update(payload.mailboxId, { status: "soft_deleted" });
  await recordAudit(context.store, "user", payload.actorUserId, "mailbox-soft-delete", {
    mailboxId: payload.mailboxId
  });

  return { ok: true };
}

export async function bulkDeleteMailboxesAsAdmin(
  context: MailboxUseCaseContext,
  payload: {
    actorUserId: string;
    accountIds: string[];
    mode: "soft" | "hard";
    confirmationPhrase?: string;
  }
) {
  const accountPolicy = await getAccountPolicy(context);
  const accountIds = Array.from(new Set(payload.accountIds));

  if (payload.mode === "soft") {
    if (accountIds.length > accountPolicy.protection.standardBulkLimit) {
      return jsonError("Bulk action exceeds the configured standard limit", 400);
    }

    for (const accountId of accountIds) {
      const mailbox = await findMailboxDetailOrError(context, accountId);
      if (mailbox instanceof Response) return mailbox;
      await context.store.mailboxes.update(accountId, { status: "soft_deleted" });
    }

    if (accountPolicy.protection.auditLoggingEnabled) {
      await recordAudit(context.store, "user", payload.actorUserId, "mailbox-bulk-soft-delete", {
        accountIds
      });
    }

    return { ok: true, deleted: accountIds.length };
  }

  if (!accountPolicy.lifecycle.allowHardDelete) {
    return jsonError("Hard deletion is disabled by account policy", 403);
  }

  if (accountIds.length > accountPolicy.protection.hardDeleteLimit) {
    return jsonError("Hard delete exceeds the configured limit", 400);
  }

  const expectedPhrase = `DELETE ${accountIds.length} ACCOUNTS`;
  if (accountPolicy.protection.requireDangerPhrase && payload.confirmationPhrase !== expectedPhrase) {
    return jsonError("confirmationPhrase does not match the required danger phrase", 400);
  }

  const mailboxes = [];
  for (const accountId of accountIds) {
    const mailbox = await findMailboxDetailOrError(context, accountId);
    if (mailbox instanceof Response) return mailbox;
    mailboxes.push(mailbox);
  }

  if (
    accountPolicy.lifecycle.requireSoftDeleteBeforeHardDelete &&
    mailboxes.some((mailbox) => mailbox.status !== "soft_deleted")
  ) {
    return jsonError("Mailbox must be soft-deleted before hard deletion", 409);
  }

  for (const accountId of accountIds) {
    await context.store.mailboxes.delete(accountId);
  }

  if (accountPolicy.protection.auditLoggingEnabled) {
    await recordAudit(context.store, "user", payload.actorUserId, "mailbox-bulk-hard-delete", {
      accountIds
    });
  }

  return { ok: true, deleted: accountIds.length };
}
