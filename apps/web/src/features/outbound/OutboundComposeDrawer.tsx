import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
  title?: string;
  closeLabel?: string;
  children?: ReactNode;
  onClose: () => void;
  onSendMail: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function OutboundComposeDrawer({
  open,
  hasActiveMailbox,
  draft,
  title = "新建发送",
  closeLabel = "关闭新建发送抽屉",
  children,
  onClose,
  onSendMail
}: OutboundComposeDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (open) setRequestId(crypto.randomUUID());
    if (!open) {
      setIsSubmitting(false);
      setSubmitError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await onSendMail({
        currentTarget: form,
        preventDefault: () => event.preventDefault()
      } as FormEvent<HTMLFormElement>);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "提交失败，请重试。");
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <OverlayDrawer
      className="composer-panel outbound-compose-drawer"
      closeLabel={closeLabel}
      onClose={() => { if (!submitting.current) onClose(); }}
      title={title}
      width="md"
    >
      <form
        key={`${draft?.toAddress ?? ""}:${draft?.subject ?? ""}:${draft?.bodyText ?? ""}`}
        className="composer-form outbound-form outbound-compose-form"
        onChange={() => {
          setRequestId(crypto.randomUUID());
          setSubmitError(null);
        }}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <input type="hidden" name="requestId" value={requestId} />
        <FormField label="收件人" required>
          <TextInput defaultValue={draft?.toAddress ?? ""} disabled={isSubmitting} name="toAddress" required type="email" />
        </FormField>
        <FormField label="主题" required>
          <TextInput defaultValue={draft?.subject ?? ""} disabled={isSubmitting} name="subject" required />
        </FormField>
        <FormField label="正文" required>
          <TextareaInput defaultValue={draft?.bodyText ?? ""} disabled={isSubmitting} name="bodyText" required rows={8} />
        </FormField>

        {!hasActiveMailbox ? <p className="outbound-compose-note">当前没有可用邮箱，先回到邮件列表选择一个邮箱后再发送。</p> : null}
        {submitError ? <p className="outbound-compose-error" role="alert">{submitError}</p> : null}

        <div className="outbound-compose-actions">
          <Button disabled={isSubmitting} onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button disabled={!hasActiveMailbox || isSubmitting} type="submit" variant="primary">
            {isSubmitting ? "发送中…" : "发送邮件"}
          </Button>
        </div>
      </form>
      {children}
    </OverlayDrawer>
  );
}
