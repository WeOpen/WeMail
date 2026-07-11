import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

type SpinnerSize = "xs" | "sm" | "md" | "lg";
type SpinnerTone = "default" | "muted" | "accent" | "success" | "warning" | "danger";

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  decorative?: boolean;
  label?: string;
  showLabel?: boolean;
  size?: SpinnerSize;
  tone?: SpinnerTone;
};

type LoadingStateProps = HTMLAttributes<HTMLElement> & {
  description?: ReactNode;
  label: string;
  size?: SpinnerSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  {
    className,
    decorative = false,
    label = "加载中",
    showLabel = false,
    size = "md",
    tone = "default",
    ...props
  },
  ref
) {
  return (
    <span
      {...props}
      aria-hidden={decorative ? true : undefined}
      aria-label={!decorative ? label : undefined}
      aria-live={!decorative ? "polite" : undefined}
      className={cx("ui-spinner", `ui-spinner-${size}`, `ui-tone-${tone}`, showLabel && "ui-spinner-with-label", className)}
      data-state="indeterminate"
      ref={ref}
      role={!decorative ? "status" : undefined}
    >
      <span aria-hidden="true" className="ui-spinner-indicator" />
      {showLabel ? <span className="ui-spinner-label">{label}</span> : null}
    </span>
  );
});

export const LoadingState = forwardRef<HTMLElement, LoadingStateProps>(function LoadingState(
  { className, description, label, size = "md", ...props },
  ref
) {
  return (
    <section
      {...props}
      aria-busy="true"
      aria-label={label}
      className={cx("ui-loading-state", className)}
      ref={ref}
      role="status"
    >
      <Spinner decorative showLabel label={label} size={size} tone="accent" />
      {description ? <p className="ui-loading-state-description">{description}</p> : null}
    </section>
  );
});
