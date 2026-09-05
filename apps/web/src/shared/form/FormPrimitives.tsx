import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes
} from "react";
import { Search, X } from "lucide-react";

import {
  cx,
  mergeIds,
  renderFieldLabel,
  renderFieldMeta,
  renderFormCheck,
  mergeRefs,
  setNativeInputValue,
  type FormTone
} from "./internal";

type FormCheckVariant = "inline" | "card";

export { DateInput, DateTimeInput } from "./DateInput";
export type { DateInputProps, DateTimeInputProps } from "./DateInput";
export { SelectInput } from "./SelectInput";
export { MultiSelect } from "./MultiSelect";


type FormFieldProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
  message?: ReactNode;
  required?: boolean;
  tone?: FormTone;
};

type FormCheckProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> & {
  className?: string;
  description?: ReactNode;
  inputClassName?: string;
  label: ReactNode;
  variant?: FormCheckVariant;
};

type CheckboxFieldProps = FormCheckProps;
type CheckboxProps = FormCheckProps;
type RadioProps = FormCheckProps;

type RadioGroupOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

type RadioGroupFieldProps = {
  className?: string;
  defaultValue?: string;
  description?: ReactNode;
  disabled?: boolean;
  legend: ReactNode;
  message?: ReactNode;
  name: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  options: RadioGroupOption[];
  required?: boolean;
  tone?: FormTone;
  value?: string;
  variant?: FormCheckVariant;
};

type SearchInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  clearLabel?: string;
  onClear?: () => void;
};

export type MultiSelectOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};


export function FormField({ children, className, description, htmlFor, label, message, required, tone = "default" }: FormFieldProps) {
  const generatedId = useId();
  const resolvedId = htmlFor ?? generatedId;
  const descriptionId = description ? `${resolvedId}-description` : undefined;
  const messageId = message ? `${resolvedId}-message` : undefined;
  const control = isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        "aria-describedby": mergeIds(children.props["aria-describedby"], descriptionId, messageId),
        id: htmlFor ? children.props.id : children.props.id ?? resolvedId
      })
    : children;

  return (
    <div className={cx("form-field", className)}>
      <div className="form-field-copy">
        <label className="form-label" htmlFor={resolvedId}>
          {renderFieldLabel(label, required)}
        </label>
        {renderFieldMeta(description, descriptionId, message, messageId, tone)}
      </div>
      {control}
    </div>
  );
}

export const TextInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(function TextInput(
  { className, ...props },
  ref
) {
  return <input {...props} className={cx("form-control", className)} ref={ref} />;
});

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    "aria-label": ariaLabel,
    className,
    clearLabel = "清除搜索",
    defaultValue,
    disabled,
    onChange,
    onClear,
    readOnly,
    value,
    ...props
  },
  ref
) {
    const internalRef = useRef<HTMLInputElement>(null);
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue?.toString() ?? "");
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value?.toString() ?? "" : uncontrolledValue;

    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      if (!isControlled) {
        setUncontrolledValue(event.target.value);
      }
      onChange?.(event);
    }

    function handleClear() {
      const nextTarget = internalRef.current;

      if (!nextTarget) return;
      setNativeInputValue(nextTarget, "");
      if (!isControlled) {
        setUncontrolledValue("");
      }
      nextTarget.focus();
      onClear?.();
    }

    return (
      <div
        className={cx("ui-search-input", disabled && "is-disabled", className)}
        data-disabled={disabled ? "true" : undefined}
        data-state={currentValue ? "has-value" : "empty"}
      >
        <span aria-hidden="true" className="ui-search-input-icon">
          <Search size={16} strokeWidth={1.8} />
        </span>
        <input
          {...props}
          aria-label={ariaLabel}
          className="form-control ui-search-input-control"
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={handleChange}
          readOnly={readOnly}
          ref={mergeRefs(ref, internalRef)}
          type="search"
          value={value}
        />
        {currentValue && !disabled && !readOnly ? (
          <button
            aria-label={clearLabel}
            className="ui-search-input-clear"
            onClick={handleClear}
            type="button"
          >
            <X aria-hidden="true" size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>
    );
  }
);


export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaInput(
  { className, ...props },
  ref
) {
  return <textarea {...props} className={cx("form-control", "form-textarea", className)} ref={ref} />;
});

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
  const generatedId = useId();
  return renderFormCheck("checkbox", props.id ?? generatedId, props, ref);
});

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(props, ref) {
  const generatedId = useId();
  return renderFormCheck("radio", props.id ?? generatedId, props, ref);
});

export function CheckboxField(props: CheckboxFieldProps) {
  return <Checkbox {...props} />;
}


export function RadioGroupField({
  className,
  defaultValue,
  description,
  disabled = false,
  legend,
  message,
  name,
  onChange,
  options,
  required = false,
  tone = "default",
  value,
  variant = "inline"
}: RadioGroupFieldProps) {
  const groupId = useId();

  return (
    <fieldset className={cx("form-radio-group", className)}>
      <legend className="form-label">{legend}</legend>
      {renderFieldMeta(description, `${groupId}-description`, message, `${groupId}-message`, tone)}
      <div className="form-radio-group-options">
        {options.map((option) => {
          const isControlled = typeof value === "string";
          const checkedProps = isControlled ? { checked: value === option.value } : { defaultChecked: defaultValue === option.value };

          return (
            <Radio
              {...checkedProps}
              description={option.description}
              disabled={disabled || option.disabled}
              key={option.value}
              label={option.label}
              name={name}
              onChange={onChange}
              required={required}
              value={option.value}
              variant={variant}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
