import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../shared/button";
import { FormField, TextInput, TextareaInput } from "../../shared/form";
import { OverlayDrawer } from "../../shared/overlay";

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
    <OverlayDrawer
      className="composer-panel outbound-compose-drawer"
      closeLabel="关闭新建发送抽屉"
      description="通过抽屉快速补发或发送测试邮件，不打断当前的发件记录排查流程。"
      eyebrow="发件动作"
      onClose={onClose}
      title="新建发送"
      width="md"
    >
      <form
        key={`${draft?.toAddress ?? ""}:${draft?.subject ?? ""}:${draft?.bodyText ?? ""}`}
        className="composer-form outbound-form outbound-compose-form"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FormField label="收件人" required>
          <TextInput defaultValue={draft?.toAddress ?? ""} name="toAddress" required type="email" />
        </FormField>
        <FormField label="主题" required>
          <TextInput defaultValue={draft?.subject ?? ""} name="subject" required />
        </FormField>
        <FormField label="正文" required>
          <TextareaInput defaultValue={draft?.bodyText ?? ""} name="bodyText" required rows={8} />
        </FormField>

        {!hasActiveMailbox ? <p className="outbound-compose-note">当前没有可用邮箱，先回到邮件列表选择一个邮箱后再发送。</p> : null}
        {submitError ? <p className="outbound-compose-error">{submitError}</p> : null}

        <div className="outbound-compose-actions">
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button disabled={!hasActiveMailbox || isSubmitting} type="submit" variant="primary">
            {isSubmitting ? "发送中…" : "发送邮件"}
          </Button>
        </div>
      </form>
    </OverlayDrawer>
  );
}
