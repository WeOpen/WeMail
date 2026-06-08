import type { FeatureToggles } from "@wemail/shared";

import type { AppBindings, AppStore } from "../../core/bindings";
import { jsonError, recordAudit } from "../services/audit-service";
import { buildMailboxAddress } from "../services/address-service";
import { getMailDomains, getMailDomainsForRole, getMailboxLimit } from "../services/config-service";
import { getOwnedMailbox } from "../services/mailbox-access-service";

type MailboxUseCaseContext = {
  store: AppStore;
  featureToggles: Pick<FeatureToggles, "mailboxCreationEnabled">;
  env: Pick<AppBindings, "DEFAULT_MAIL_DOMAIN" | "MAILBOX_LIMIT">;
};

export async function listUserMailboxes(context: MailboxUseCaseContext, userId: string) {
  return context.store.mailboxes.listByUser(userId);
}

export async function createUserMailbox(
  context: MailboxUseCaseContext,
  payload: { userId: string; label: string }
) {
  if (!context.featureToggles.mailboxCreationEnabled) {
    return jsonError("Mailbox creation disabled", 403);
  }

  if ((await context.store.mailboxes.countByUser(payload.userId)) >= getMailboxLimit(context.env)) {
    return jsonError("Mailbox limit reached", 403);
  }

  const user = await context.store.users.findById(payload.userId);
  if (!user) return jsonError("User not found", 404);

  const [primaryDomain] = getMailDomainsForRole(await getMailDomains(context.store, context.env), user.role);
  if (!primaryDomain) return jsonError("No mail domain is available for this role", 403);

  const mailbox = await context.store.mailboxes.create({
    userId: payload.userId,
    label: payload.label,
    address: buildMailboxAddress(primaryDomain.domain, payload.label)
  });

  await recordAudit(context.store, "user", payload.userId, "mailbox-create", {
    mailboxId: mailbox.id
  });

  return mailbox;
}

export async function deleteUserMailbox(
  context: MailboxUseCaseContext,
  payload: { userId: string; mailboxId: string }
) {
  const mailbox = await getOwnedMailbox(context.store, payload.userId, payload.mailboxId);
  if (!mailbox) return jsonError("Mailbox not found", 404);

  await context.store.mailboxes.delete(payload.mailboxId);
  await recordAudit(context.store, "user", payload.userId, "mailbox-delete", {
    mailboxId: payload.mailboxId
  });

  return { ok: true };
}
