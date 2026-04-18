import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";

type OutboundComposeDraft = {
  toAddress?: string;
  subject?: string;
  bodyText?: string;
};

type OutboundComposeDrawerProps = {
  open: boolean;
  hasActiveMailbox: boolean;
  draft?: OutboundComposeDraft;
  onClose: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundComposeDrawer({
  open,
  hasActiveMailbox,
  draft,
  onClose,
  onSendMail
}: OutboundComposeDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSendMail({
        currentTarget: form,
        preventDefault: () => event.preventDefault()
      } as FormEvent<HTMLFormElement>);
      onClose();
    } catch {
      setSubmitError("发送失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="workspace-drawer-backdrop" role="presentation">
      <section
        aria-labelledby="outbound-compose-drawer-title"
        aria-modal="true"
        className="workspace-drawer panel composer-panel outbound-compose-drawer"
        role="dialog"
      >
        <div className="workspace-dialog-header">
          <div>
            <p className="panel-kicker">发件动作</p>
            <h2 id="outbound-compose-drawer-title">新建发送</h2>
            <p className="section-copy">通过抽屉快速补发或发送测试邮件，不打断当前的发件记录排查流程。</p>
          </div>
          <button aria-label="关闭新建发送抽屉" className="workspace-theme-toggle" onClick={onClose} type="button">
            <X absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
          </button>
        </div>

        <form
          key={`${draft?.toAddress ?? ""}:${draft?.subject ?? ""}:${draft?.bodyText ?? ""}`}
          className="composer-form outbound-form outbound-compose-form"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <label>
            收件人
            <input defaultValue={draft?.toAddress ?? ""} name="toAddress" required type="email" />
          </label>
          <label>
            主题
            <input defaultValue={draft?.subject ?? ""} name="subject" required />
          </label>
          <label>
            正文
            <textarea defaultValue={draft?.bodyText ?? ""} name="bodyText" required rows={8} />
          </label>

          {!hasActiveMailbox ? (
            <p className="outbound-compose-note">当前没有可用邮箱，先回到邮件列表选择一个邮箱后再发送。</p>
          ) : null}
          {submitError ? <p className="outbound-compose-error">{submitError}</p> : null}

          <div className="outbound-compose-actions">
            <button className="workspace-action-button secondary" onClick={onClose} type="button">
              取消
            </button>
            <button className="workspace-action-button primary" disabled={!hasActiveMailbox || isSubmitting} type="submit">
              {isSubmitting ? "发送中…" : "发送邮件"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
