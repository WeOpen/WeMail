import { type ReactNode, useId } from "react";
import { X } from "lucide-react";

import { Button } from "../button";

type OverlayBaseProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  description?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  title: ReactNode;
};

type OverlayDrawerProps = OverlayBaseProps & {
  width?: "sm" | "md" | "lg";
};

type OverlayDialogProps = OverlayBaseProps & {
  size?: "sm" | "md" | "lg";
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function stopPanelClick(event: React.MouseEvent) {
  event.stopPropagation();
}

function OverlayHeader({
  closeLabel,
  description,
  eyebrow,
  onClose,
  title,
  titleId
}: Pick<OverlayBaseProps, "closeLabel" | "description" | "eyebrow" | "onClose" | "title"> & { titleId: string }) {
  return (
    <div className="ui-overlay-header">
      <div className="ui-overlay-title-block">
        {eyebrow ? <p className="ui-overlay-eyebrow">{eyebrow}</p> : null}
        <h2 id={titleId}>{title}</h2>
        {description ? <p className="ui-overlay-description">{description}</p> : null}
      </div>
      <Button aria-label={closeLabel ?? "关闭弹层"} iconOnly onClick={onClose} size="sm" variant="icon">
        <X absoluteStrokeWidth aria-hidden="true" className="workspace-icon" strokeWidth={1.9} />
      </Button>
    </div>
  );
}

export function OverlayDrawer({
  children,
  ariaLabel,
  className,
  closeLabel,
  closeOnBackdrop,
  description,
  eyebrow,
  footer,
  onClose,
  title,
  width = "md"
}: OverlayDrawerProps) {
  const titleId = useId();

  return (
    <div
      className="ui-overlay-backdrop ui-overlay-backdrop-drawer"
      data-testid="overlay-backdrop"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <section
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-modal="true"
        className={cx("ui-overlay-panel ui-overlay-drawer panel", `ui-overlay-drawer-${width}`, className)}
        onClick={stopPanelClick}
        role="dialog"
      >
        <OverlayHeader closeLabel={closeLabel} description={description} eyebrow={eyebrow} onClose={onClose} title={title} titleId={titleId} />
        <div className="ui-overlay-body">{children}</div>
        {footer ? <div className="ui-overlay-footer">{footer}</div> : null}
      </section>
    </div>
  );
}

export function OverlayDialog({
  children,
  ariaLabel,
  className,
  closeLabel,
  closeOnBackdrop,
  description,
  eyebrow,
  footer,
  onClose,
  size = "md",
  title
}: OverlayDialogProps) {
  const titleId = useId();

  return (
    <div
      className="ui-overlay-backdrop ui-overlay-backdrop-dialog"
      data-testid="overlay-backdrop"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <section
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-modal="true"
        className={cx("ui-overlay-panel ui-overlay-dialog panel", `ui-overlay-dialog-${size}`, className)}
        onClick={stopPanelClick}
        role="dialog"
      >
        <OverlayHeader closeLabel={closeLabel} description={description} eyebrow={eyebrow} onClose={onClose} title={title} titleId={titleId} />
        <div className="ui-overlay-body">{children}</div>
        {footer ? <div className="ui-overlay-footer">{footer}</div> : null}
      </section>
    </div>
  );
}
