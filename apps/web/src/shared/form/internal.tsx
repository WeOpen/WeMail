import {
  Children,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes
} from "react";

export type SelectOptionRecord = {
  disabled?: boolean;
  label: ReactNode;
  textValue: string;
  value: string;
};

export type FormTone = "default" | "error" | "success";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function mergeIds(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ") || undefined;
}

export function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T) => {
    refs.forEach((ref) => assignRef(ref, value));
  };
}

export function setNativeInputValue(input: HTMLInputElement, nextValue: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function setNativeSelectValue(select: HTMLSelectElement, nextValue: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(select, nextValue);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

export function getTextValue(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getTextValue).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextValue(node.props.children);
  }

  return "";
}

export function getSelectOptions(children: ReactNode): SelectOptionRecord[] {
  return Children.toArray(children)
    .filter((child): child is ReactElement<ComponentPropsWithoutRef<"option">> => {
      return isValidElement<ComponentPropsWithoutRef<"option">>(child) && child.type === "option";
    })
    .map((child) => {
      const label = child.props.children;
      const textValue = getTextValue(label);
      const value = child.props.value === undefined ? textValue : String(child.props.value);

      return {
        disabled: child.props.disabled,
        label,
        textValue,
        value
      };
    });
}

export function normalizeSelectValue(value: SelectHTMLAttributes<HTMLSelectElement>["value"] | SelectHTMLAttributes<HTMLSelectElement>["defaultValue"]) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function renderFieldMeta(
  description?: ReactNode,
  descriptionId?: string,
  message?: ReactNode,
  messageId?: string,
  tone: FormTone = "default"
) {
  return (
    <>
      {description ? (
        <span className="form-description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      {message ? (
        <span className="form-message" data-tone={tone} id={messageId}>
          {message}
        </span>
      ) : null}
    </>
  );
}

export function renderFieldLabel(label: ReactNode, required?: boolean) {
  return (
    <span className="form-label">
      <span>{label}</span>
      {required ? (
        <span aria-hidden="true" className="form-label-required">
          *
        </span>
      ) : null}
    </span>
  );
}

export type FormCheckBaseProps = Omit<ComponentPropsWithoutRef<"input">, "children" | "type"> & {
  description?: ReactNode;
  inputClassName?: string;
  label: ReactNode;
  variant?: "inline" | "card";
};

export function renderFormCheck(
  type: "checkbox" | "radio",
  inputId: string,
  {
    className,
    description,
    inputClassName,
    label,
    variant = "inline",
    ...props
  }: FormCheckBaseProps,
  ref: Ref<HTMLInputElement>
) {
  const descriptionId = description ? `${inputId}-description` : undefined;
  const isChecked = props.checked ?? props.defaultChecked;

  return (
    <div
      className={cx(
        "form-check",
        `form-check-${variant}`,
        props.disabled && "is-disabled",
        className
      )}
      data-disabled={props.disabled ? "true" : undefined}
      data-state={isChecked ? "checked" : "unchecked"}
    >
      <input
        {...props}
        aria-describedby={mergeIds(props["aria-describedby"], descriptionId)}
        className={cx("form-check-input", inputClassName)}
        id={inputId}
        ref={ref}
        type={type}
      />
      <span className="form-check-copy">
        <label className="form-check-label" htmlFor={inputId}>
          {label}
        </label>
        {description ? (
          <span className="form-check-description" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
    </div>
  );
}


export function getMultiSelectSummary(selectedValues: string[], options: { value: string; label: ReactNode }[], placeholder: ReactNode) {
  if (selectedValues.length === 0) return placeholder;

  const labels = selectedValues
    .map((selectedValue) => options.find((option) => option.value === selectedValue)?.label)
    .filter((label): label is ReactNode => label !== undefined);

  return labels.map((label, index) => (
    <span key={selectedValues[index]}>
      {index > 0 ? ", " : null}
      {label}
    </span>
  ));
}

export function moveFocus(optionRefs: Array<HTMLElement | null>, startIndex: number, step: 1 | -1) {
  const total = optionRefs.length;
  let cursor = startIndex;

  for (let attempts = 0; attempts < total; attempts += 1) {
    cursor = (cursor + step + total) % total;
    const next = optionRefs[cursor];

    if (next && !next.hasAttribute("disabled") && next.getAttribute("aria-disabled") !== "true") {
      next.focus();
      return;
    }
  }
}

