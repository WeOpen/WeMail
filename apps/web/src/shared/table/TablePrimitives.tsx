import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes
} from "react";

import { EmptyState } from "../empty-state";
import { Spinner } from "../spinner";

type TableAlign = "start" | "center" | "end";
type TableDensity = "compact" | "comfortable" | "spacious";
type TableVariant = "liquid" | "solid";

type SharedCellProps = {
  align?: TableAlign;
  nowrap?: boolean;
  width?: CSSProperties["width"];
};

type TableContainerProps = HTMLAttributes<HTMLDivElement> & {
  density?: TableDensity;
  variant?: TableVariant;
};

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  isInteractive?: boolean;
  isSelected?: boolean;
};

type TableStateCardProps = HTMLAttributes<HTMLElement> & {
  description?: string;
  state?: "empty" | "loading";
  title: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function resolveAlign(align?: TableAlign) {
  return align && align !== "start" ? align : undefined;
}

function mergeWidth(width: SharedCellProps["width"], style?: CSSProperties) {
  return width === undefined ? style : { width, ...style };
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(
  function TableContainer({ className, density = "comfortable", variant = "liquid", ...props }, ref) {
    return (
      <div
        {...props}
        className={cx("ui-table-container", `ui-table-container-${variant}`, `ui-table-density-${density}`, className)}
        data-density={density}
        data-variant={variant}
        ref={ref}
      />
    );
  }
);

export const Table = forwardRef<HTMLTableElement, TableHTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return <table {...props} className={cx("ui-table", className)} ref={ref} />;
  }
);

export const TableHead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableHead({ className, ...props }, ref) {
    return <thead {...props} className={cx("ui-table-head", className)} ref={ref} />;
  }
);

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  function TableBody({ className, ...props }, ref) {
    return <tbody {...props} className={cx("ui-table-body", className)} ref={ref} />;
  }
);

export const TableRow = forwardRef<HTMLTableRowElement, TableRowProps>(
  function TableRow({ className, isInteractive, isSelected, ...props }, ref) {
    return (
      <tr
        {...props}
        className={cx("ui-table-row", isInteractive && "is-interactive", isSelected && "is-selected", className)}
        data-interactive={isInteractive ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        ref={ref}
      />
    );
  }
);

type TableHeaderCellProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, "align"> & SharedCellProps;

export const TableHeaderCell = forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  function TableHeaderCell({ align, className, nowrap, scope = "col", style, width, ...props }, ref) {
    return (
      <th
        {...props}
        className={cx("ui-table-header-cell", className)}
        data-align={resolveAlign(align)}
        data-nowrap={nowrap ? "true" : undefined}
        ref={ref}
        scope={scope}
        style={mergeWidth(width, style)}
      />
    );
  }
);

type TableCellProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, "align"> & SharedCellProps;

export const TableCell = forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell({ align, className, nowrap, style, width, ...props }, ref) {
    return (
      <td
        {...props}
        className={cx("ui-table-cell", className)}
        data-align={resolveAlign(align)}
        data-nowrap={nowrap ? "true" : undefined}
        ref={ref}
        style={mergeWidth(width, style)}
      />
    );
  }
);

export const TableStateCard = forwardRef<HTMLElement, TableStateCardProps>(function TableStateCard(
  { className, description, state = "empty", title, ...props },
  ref
) {
  if (state === "loading") {
    return (
      <section
        {...props}
        aria-busy="true"
        aria-label={title}
        className={cx("ui-table-state-card", "ui-table-state-card-loading", className)}
        ref={ref}
        role="status"
      >
        <Spinner decorative showLabel label={title} size="md" tone="accent" />
        {description ? <p className="ui-table-state-description">{description}</p> : null}
      </section>
    );
  }

  return (
    <EmptyState
      {...props}
      className={cx("ui-table-state-card", "ui-table-state-card-empty", className)}
      description={description}
      ref={ref}
      title={title}
    />
  );
});
