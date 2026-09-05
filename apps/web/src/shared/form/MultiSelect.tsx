import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import { ChevronDown, X } from "lucide-react";

import { Checkbox } from "./FormPrimitives";
import { cx, getMultiSelectSummary, mergeRefs, moveFocus } from "./internal";

type MultiSelectProps = Omit<ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> & {
  clearLabel?: string;
  defaultValue?: string[];
  disabled?: boolean;
  emptyText?: ReactNode;
  name?: string;
  onValueChange?: (nextValue: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: ReactNode;
  value?: string[];
};


export type MultiSelectOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(function MultiSelect(
  {
    "aria-label": ariaLabel,
    className,
    clearLabel = "清空选择",
    defaultValue = [],
    disabled = false,
    emptyText = "暂无可选项",
    name,
    onValueChange,
    options,
    placeholder = "请选择",
    value,
    ...props
  },
  ref
) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = value !== undefined;
  const selectedValues = isControlled ? value : internalValue;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const currentRoot = rootRef.current;
      if (!currentRoot || currentRoot.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const firstSelectedIndex = options.findIndex((option) => selectedValues.includes(option.value) && !option.disabled);
    const focusIndex = firstSelectedIndex >= 0 ? firstSelectedIndex : options.findIndex((option) => !option.disabled);
    optionRefs.current[focusIndex]?.focus();
  }, [isOpen, options, selectedValues]);

  function commitValue(nextValue: string[]) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function toggleValue(nextOptionValue: string) {
    const nextValue = selectedValues.includes(nextOptionValue)
      ? selectedValues.filter((selectedValue) => selectedValue !== nextOptionValue)
      : [...selectedValues, nextOptionValue];

    commitValue(nextValue);
  }

  function closePanel() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function handleOptionKeyDown(index: number) {
    return (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(optionRefs.current, index, 1);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(optionRefs.current, index, -1);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    };
  }

  function handleClear() {
    commitValue([]);
  }

  const summary = getMultiSelectSummary(selectedValues, options, placeholder);
  const hasSelection = selectedValues.length > 0;
  const labelText = typeof ariaLabel === "string" ? ariaLabel : "多选";

  return (
    <div
      {...props}
      className={cx("ui-multi-select", disabled && "is-disabled", className)}
      data-state={isOpen ? "open" : "closed"}
      ref={mergeRefs(ref, rootRef)}
    >
      <div className="ui-multi-select-trigger-shell">
        <button
          aria-controls={panelId}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={ariaLabel}
          className="ui-multi-select-trigger"
          disabled={disabled}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className={cx("ui-multi-select-value", !hasSelection && "is-placeholder")}>{summary}</span>
          <span aria-hidden="true" className="ui-multi-select-actions">
            <ChevronDown className="ui-multi-select-chevron" size={16} strokeWidth={1.8} />
          </span>
        </button>
        {hasSelection && !disabled ? (
          <button
            aria-label={clearLabel}
            className="ui-multi-select-clear"
            onClick={handleClear}
            type="button"
          >
            <X size={14} strokeWidth={2} />
          </button>
        ) : null}
      </div>

      {name
        ? selectedValues.map((selectedValue) => <input key={selectedValue} name={name} type="hidden" value={selectedValue} />)
        : null}

      {isOpen ? (
        <div aria-label={labelText} className="ui-multi-select-panel" id={panelId} role="dialog">
          {options.length === 0 ? <div className="ui-multi-select-empty">{emptyText}</div> : null}
          {options.map((option, index) => {
            const isSelected = selectedValues.includes(option.value);

            return (
              <Checkbox
                checked={isSelected}
                className="ui-multi-select-option"
                description={option.description}
                disabled={option.disabled}
                inputClassName="ui-multi-select-option-input"
                key={option.value}
                label={option.label}
                onChange={() => {
                  if (option.disabled) return;
                  toggleValue(option.value);
                }}
                onKeyDown={handleOptionKeyDown(index)}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                variant="card"
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

