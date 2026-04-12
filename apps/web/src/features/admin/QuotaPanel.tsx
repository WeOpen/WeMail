import type { FormEvent } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";

type QuotaPanelProps = {
  adminUsers: UserSummary[];
  adminQuota: QuotaSummary | null;
  onSelectQuotaUser: (userId: string) => Promise<void>;
  onSubmitQuota: (event: FormEvent<HTMLFormElement>, userId: string) => Promise<void>;
};

export function QuotaPanel({
  adminUsers,
  adminQuota,
  onSelectQuotaUser,
  onSubmitQuota
}: QuotaPanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">Delivery limits</p>
      <h2>Quota control</h2>
      <p className="section-copy">Select an operator, tune daily outbound allowance, and pause abusive senders from the same card.</p>
      <div className="stack-list workspace-stack-list workspace-stack-compact">
        {adminUsers.map((user) => (
          <button key={user.id} className="stack-item selectable admin-stack-item" onClick={() => void onSelectQuotaUser(user.id)} type="button">
            <div>
              <strong>{user.email}</strong>
              <span>{user.role === "admin" ? "Admin" : "Member"}</span>
            </div>
            <small>{user.createdAt.slice(0, 10)}</small>
          </button>
        ))}
      </div>
      {adminQuota ? (
        <form className="composer-form" onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}>
          <label>
            Daily send limit
            <input name="dailyLimit" type="number" defaultValue={adminQuota.dailyLimit} />
          </label>
          <label className="checkbox-row">
            <input name="disabled" type="checkbox" defaultChecked={adminQuota.disabled} />
            Pause outbound access for this user
          </label>
          <button className="workspace-action-button primary" type="submit">
            Save quota
          </button>
        </form>
      ) : (
        <p className="empty-state">Choose an operator to inspect quota status.</p>
      )}
    </section>
  );
}
