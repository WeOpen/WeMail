import { formatInviteStatus } from "./formatters";
import type { InviteSummary } from "./types";

type InvitePanelProps = {
  adminInvites: InviteSummary[];
  onCreateInvite: () => Promise<void>;
  onDisableInvite: (inviteId: string) => Promise<void>;
};

export function InvitePanel({ adminInvites, onCreateInvite, onDisableInvite }: InvitePanelProps) {
  return (
    <section className="panel workspace-card page-panel">
      <p className="panel-kicker">Access flow</p>
      <h2>Invite control</h2>
      <p className="section-copy">Launch, revoke, and review invitation codes without leaving the operator dashboard.</p>
      <button className="workspace-action-button primary" onClick={() => void onCreateInvite()} type="button">
        Create invite
      </button>
      <div className="stack-list workspace-stack-list">
        {adminInvites.map((invite) => (
          <div key={invite.id} className="stack-item admin-stack-item">
            <div>
              <strong>{invite.code}</strong>
              <span>{formatInviteStatus(invite)}</span>
            </div>
            <button className="workspace-action-button ghost" onClick={() => void onDisableInvite(invite.id)} type="button">
              Disable
            </button>
          </div>
        ))}
        {adminInvites.length === 0 ? <p className="empty-state">No invites are active. Create one to onboard the next operator.</p> : null}
      </div>
    </section>
  );
}
