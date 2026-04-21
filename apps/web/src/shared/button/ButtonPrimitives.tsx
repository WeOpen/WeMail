import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "ghost" | "text" | "danger" | "icon" | "pill";
type ButtonSize = "xs" | "sm" | "md" | "lg";

type ButtonSharedProps = {
  children?: ReactNode;
  className?: string;
  contentLayout?: "label" | "plain";
  fullWidth?: boolean;
  iconOnly?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  loadingLabel?: ReactNode;
  size?: ButtonSize;
  trailingIcon?: ReactNode;
  variant?: ButtonVariant;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonSharedProps;
type ButtonLinkProps = Omit<LinkProps, "children" | "className"> & ButtonSharedProps;
type ButtonAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & ButtonSharedProps;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function getButtonClassName({
  className,
  fullWidth,
  iconOnly,
  isActive,
  isDisabled,
  isLoading,
  size = "md",
  variant = "primary"
}: Pick<
  ButtonSharedProps,
  "className" | "fullWidth" | "iconOnly" | "isActive" | "isDisabled" | "isLoading" | "size" | "variant"
>) {
  return cx(
    "ui-button",
    `ui-button-${variant}`,
    `ui-button-size-${size}`,
    iconOnly && "ui-button-icon-only",
    fullWidth && "ui-button-full-width",
    isActive && "is-active",
    isDisabled && "ui-button-disabled",
    isLoading && "ui-button-loading",
    className
  );
}

function renderButtonContent({
  children,
  contentLayout = "label",
  iconOnly,
  isLoading,
  leadingIcon,
  loadingLabel,
  trailingIcon
}: Pick<
  ButtonSharedProps,
  "children" | "contentLayout" | "iconOnly" | "isLoading" | "leadingIcon" | "loadingLabel" | "trailingIcon"
>) {
  if (isLoading) {
    return (
      <>
        <span className="ui-button-spinner" aria-hidden="true" />
        <span className="ui-button-loading-label">{loadingLabel ?? "加载中"}</span>
        {children ? (
          <span className="ui-button-label ui-button-label-hidden" aria-hidden="true">
            {children}
          </span>
        ) : null}
      </>
    );
  }

  if (iconOnly) {
    return (
      <span className="ui-button-icon-slot" aria-hidden="true">
        {leadingIcon ?? children ?? trailingIcon}
      </span>
    );
  }

  if (contentLayout === "plain") {
    return (
      <>
        {leadingIcon ? (
          <span className="ui-button-icon-slot" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        {children}
        {trailingIcon ? (
          <span className="ui-button-icon-slot" aria-hidden="true">
            {trailingIcon}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      {leadingIcon ? (
        <span className="ui-button-icon-slot" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}
      {children ? <span className="ui-button-label">{children}</span> : null}
      {trailingIcon ? (
        <span className="ui-button-icon-slot" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    contentLayout,
    disabled,
    fullWidth,
    iconOnly,
    isActive,
    isDisabled,
    isLoading,
    leadingIcon,
    loadingLabel,
    size,
    trailingIcon,
    type = "button",
    variant,
    ...props
  },
  ref
) {
  const isUnavailable = Boolean(disabled || isDisabled || isLoading);

  return (
    <button
      {...props}
      aria-busy={isLoading ? true : props["aria-busy"]}
      className={getButtonClassName({ className, fullWidth, iconOnly, isActive, isDisabled: isUnavailable, isLoading, size, variant })}
      data-state={isLoading ? "loading" : isActive ? "active" : undefined}
      disabled={isUnavailable}
      ref={ref}
      type={type}
    >
      {renderButtonContent({ children, contentLayout, iconOnly, isLoading, leadingIcon, loadingLabel, trailingIcon })}
    </button>
  );
});

function handleDisabledLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  {
    children,
    className,
    contentLayout,
    fullWidth,
    iconOnly,
    isActive,
    isDisabled,
    isLoading,
    leadingIcon,
    loadingLabel,
    onClick,
    size,
    to,
    trailingIcon,
    variant,
    ...props
  },
  ref
) {
  const isUnavailable = Boolean(isDisabled || isLoading);

  return (
    <Link
      {...props}
      aria-busy={isLoading ? true : props["aria-busy"]}
      aria-disabled={isUnavailable ? true : props["aria-disabled"]}
      className={getButtonClassName({ className, fullWidth, iconOnly, isActive, isDisabled: isUnavailable, isLoading, size, variant })}
      data-state={isLoading ? "loading" : isActive ? "active" : undefined}
      onClick={isUnavailable ? handleDisabledLinkClick : onClick}
      ref={ref}
      tabIndex={isUnavailable ? -1 : props.tabIndex}
      to={to}
    >
      {renderButtonContent({ children, contentLayout, iconOnly, isLoading, leadingIcon, loadingLabel, trailingIcon })}
    </Link>
  );
}
);

export const ButtonAnchor = forwardRef<HTMLAnchorElement, ButtonAnchorProps>(function ButtonAnchor(
  {
    children,
    className,
    contentLayout,
    fullWidth,
    iconOnly,
    isActive,
    isDisabled,
    isLoading,
    leadingIcon,
    loadingLabel,
    onClick,
    size,
    trailingIcon,
    variant,
    ...props
  },
  ref
) {
  const isUnavailable = Boolean(isDisabled || isLoading);

  return (
    <a
      {...props}
      aria-busy={isLoading ? true : props["aria-busy"]}
      aria-disabled={isUnavailable ? true : props["aria-disabled"]}
      className={getButtonClassName({ className, fullWidth, iconOnly, isActive, isDisabled: isUnavailable, isLoading, size, variant })}
      data-state={isLoading ? "loading" : isActive ? "active" : undefined}
      onClick={isUnavailable ? handleDisabledLinkClick : onClick}
      ref={ref}
      tabIndex={isUnavailable ? -1 : props.tabIndex}
    >
      {renderButtonContent({ children, contentLayout, iconOnly, isLoading, leadingIcon, loadingLabel, trailingIcon })}
    </a>
  );
});
