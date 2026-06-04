import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

type MetricCardTone = "default" | "hero";
type MetricCardValueSize = "lg" | "xl";

type MetricCardProps = HTMLAttributes<HTMLElement> & {
  caption?: ReactNode;
  detail?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
  tone?: MetricCardTone;
  value: ReactNode;
  valueSize?: MetricCardValueSize;
  visualIcon?: ReactNode;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const MetricCard = forwardRef<HTMLElement, MetricCardProps>(function MetricCard(
  {
    caption,
    className,
    detail,
    kicker,
    title,
    tone = "default",
    value,
    valueSize = "xl",
    visualIcon,
    ...props
  },
  ref
) {
  return (
    <article
      {...props}
      className={cx("ui-metric-card", `ui-metric-card-${tone}`, `ui-metric-card-value-${valueSize}`, className)}
      ref={ref as never}
    >
      {kicker ? <p className="panel-kicker ui-metric-card-kicker">{kicker}</p> : null}
      <h2 className="ui-metric-card-title">{title}</h2>
      <strong className="ui-metric-card-value">{value}</strong>
      {detail ? <span className="ui-metric-card-detail">{detail}</span> : null}
      {caption ? <small className="ui-metric-card-caption">{caption}</small> : null}
      {visualIcon ? <span className="ui-metric-card-visual-icon">{visualIcon}</span> : null}
    </article>
  );
});
