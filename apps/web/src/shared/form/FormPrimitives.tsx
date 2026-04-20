import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId
} from "react";

type FormTone = "default" | "error" | "success";

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

type CheckboxFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type"> & {
  className?: string;
  description?: ReactNode;
  inputClassName?: string;
  label: ReactNode;
  variant?: "inline" | "card";
};

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
  variant?: "inline" | "card";
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function mergeIds(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ") || undefined;
}

function renderFieldMeta(
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

function renderFieldLabel(label: ReactNode, required?: boolean) {
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

export function FormField({ children, className, description, htmlFor, label, message, required, tone = "default" }: FormFieldProps) {
  const generatedId = useId();
  const resolvedId = htmlFor ?? generatedId;
  const descriptionId = description ? `${resolvedId}-description` : undefined;
  const messageId = message ? `${resolvedId}-message` : undefined;
  const control = isValidElement<{ id?: string; "aria-describedby"?: string }>(children)
    ? cloneElement(children, {
        "aria-describedby": mergeIds(children.props["aria-describedby"], descriptionId, messageId),
        id: children.props.id ?? resolvedId
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

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput(
  { className, ...props },
  ref
) {
  return <select {...props} className={cx("form-control", "form-select", className)} ref={ref} />;
});

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaInput(
  { className, ...props },
  ref
) {
  return <textarea {...props} className={cx("form-control", "form-textarea", className)} ref={ref} />;
});

export function CheckboxField({
  className,
  description,
  inputClassName,
  label,
  variant = "inline",
  ...props
}: CheckboxFieldProps) {
  const generatedId = useId();
  const inputId = props.id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;

  return (
    <div className={cx("form-check", `form-check-${variant}`, className)}>
      <input
        {...props}
        aria-describedby={mergeIds(props["aria-describedby"], descriptionId)}
        className={cx("form-check-input", inputClassName)}
        id={inputId}
        type="checkbox"
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
        {options.map((option, index) => {
          const isControlled = typeof value === "string";
          const checkedProps = isControlled ? { checked: value === option.value } : { defaultChecked: defaultValue === option.value };
          const optionId = `${groupId}-${index}`;
          const optionDescriptionId = option.description ? `${optionId}-description` : undefined;

          return (
            <div
              className={cx("form-check", `form-check-${variant}`, "form-radio-option", option.disabled || disabled ? "is-disabled" : undefined)}
              key={option.value}
            >
              <input
                {...checkedProps}
                aria-describedby={optionDescriptionId}
                className="form-check-input"
                disabled={disabled || option.disabled}
                id={optionId}
                name={name}
                onChange={onChange}
                required={required}
                type="radio"
                value={option.value}
              />
              <span className="form-check-copy">
                <label className="form-check-label" htmlFor={optionId}>
                  {option.label}
                </label>
                {option.description ? (
                  <span className="form-check-description" id={optionDescriptionId}>
                    {option.description}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
