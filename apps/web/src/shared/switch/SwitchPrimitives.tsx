import {
  forwardRef,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode
} from "react";

type SwitchSize = "sm" | "md" | "lg";

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> & {
  checked: boolean;
  label?: ReactNode;
  onChange?: (checked: boolean) => void;
  size?: SwitchSize;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    checked,
    className,
    disabled,
    label,
    onChange,
    onClick,
    size = "md",
    type = "button",
    ...props
  },
  ref
) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    onChange?.(!checked);
  }

  const derivedAriaLabel = typeof label === "string" ? label : props["aria-label"];

  return (
    <button
      {...props}
      aria-checked={checked}
      aria-label={derivedAriaLabel}
      className={cx(
        "ui-switch",
        `ui-switch-size-${size}`,
        checked && "is-checked",
        disabled && "is-disabled",
        className
      )}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={handleClick}
      ref={ref}
      role="switch"
      type={type}
    >
      <span aria-hidden="true" className="ui-switch-track">
        <span className="ui-switch-thumb" />
      </span>
    </button>
  );
});
