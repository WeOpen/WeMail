import { Inbox } from "lucide-react";
import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";

type EmptyStateVariant = "default" | "error" | "no-access";

type EmptyStateProps = HTMLAttributes<HTMLElement> & {
  actions?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
  variant?: EmptyStateVariant;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    actions,
    children,
    className,
    description,
    icon,
    title,
    variant = "default",
    ...props
  },
  ref
) {
    const titleId = useId();
    const descriptionId = useId();

    return (
      <section
        {...props}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        className={cx("ui-empty-state", `ui-empty-state-${variant}`, className)}
        data-variant={variant}
        ref={ref}
        role="region"
      >
        <div aria-hidden="true" className="ui-empty-state-media">
          {icon ?? <Inbox size={26} strokeWidth={1.7} />}
        </div>
        <div className="ui-empty-state-copy">
          <h2 className="ui-empty-state-title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="ui-empty-state-description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </div>
        {children ? <div className="ui-empty-state-content">{children}</div> : null}
        {actions ? <div className="ui-empty-state-actions">{actions}</div> : null}
      </section>
    );
  }
);
