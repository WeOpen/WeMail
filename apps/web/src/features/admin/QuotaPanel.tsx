import type { FormEvent } from "react";

import type { QuotaSummary, UserSummary } from "@wemail/shared";
import { Button } from "../../shared/button";
import { CheckboxField, FormField, TextInput } from "../../shared/form";

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
      <p className="panel-kicker">配额限制</p>
      <h2>配额控制</h2>
      <p className="section-copy">选择成员后，可调整每日外发额度，并暂停异常用户的外发能力。</p>
      <div className="stack-list workspace-stack-list workspace-stack-compact">
        {adminUsers.map((user) => (
          <Button
            className="stack-item selectable admin-stack-item"
            contentLayout="plain"
            key={user.id}
            onClick={() => void onSelectQuotaUser(user.id)}
            variant="text"
          >
            <div>
              <strong>{user.email}</strong>
              <span>{user.role === "admin" ? "管理员" : "成员"}</span>
            </div>
            <small>{user.createdAt.slice(0, 10)}</small>
          </Button>
        ))}
      </div>
      {adminQuota ? (
        <form className="composer-form" onSubmit={(event) => void onSubmitQuota(event, adminQuota.userId)}>
          <FormField label="每日发送上限">
            <TextInput defaultValue={adminQuota.dailyLimit} name="dailyLimit" type="number" />
          </FormField>
          <CheckboxField defaultChecked={adminQuota.disabled} label="暂停该用户的外发能力" name="disabled" />
          <Button type="submit" variant="primary">
            保存配额
          </Button>
        </form>
      ) : (
        <p className="empty-state">请选择一个用户查看配额状态。</p>
      )}
    </section>
  );
}
