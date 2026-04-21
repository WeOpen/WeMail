import { Button } from "../../shared/button";
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
      <p className="panel-kicker">邀请流程</p>
      <h2>邀请码控制</h2>
      <p className="section-copy">创建、停用并查看邀请码状态，无需离开当前控制台。</p>
      <Button onClick={() => void onCreateInvite()} variant="primary">
        创建邀请码
      </Button>
      <div className="stack-list workspace-stack-list">
        {adminInvites.map((invite) => (
          <div key={invite.id} className="stack-item admin-stack-item">
            <div>
              <strong>{invite.code}</strong>
              <span>{formatInviteStatus(invite)}</span>
            </div>
            <Button onClick={() => void onDisableInvite(invite.id)} variant="ghost">
              停用
            </Button>
          </div>
        ))}
        {adminInvites.length === 0 ? <p className="empty-state">当前没有可用邀请码，创建一个以邀请新成员。</p> : null}
      </div>
    </section>
  );
}
