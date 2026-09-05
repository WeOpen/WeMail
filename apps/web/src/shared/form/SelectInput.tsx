import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type SelectHTMLAttributes
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

import { useFloatingPosition, usePortalRoot } from "../overlay/layer-utils";
import {
  cx,
  getSelectOptions,
  mergeRefs,
  moveFocus,
  normalizeSelectValue,
  setNativeSelectValue
} from "./internal";

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function SelectInput(
  {
    "aria-describedby": ariaDescribedBy,
    "aria-label": ariaLabel,
    children,
    className,
    defaultValue,
    disabled,
    id,
    name,
    onChange,
    required,
    value,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const nativeSelectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const portalRoot = usePortalRoot();
  const options = useMemo(() => getSelectOptions(children), [children]);
  const fallbackValue = options[0]?.value ?? "";
  const defaultSelectValue = normalizeSelectValue(defaultValue) ?? fallbackValue;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultSelectValue);
  const [isOpen, setIsOpen] = useState(false);
  const selectedValue = normalizeSelectValue(isControlled ? value : internalValue) ?? fallbackValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
  const { resolvedSide, style } = useFloatingPosition({
    anchorRef: triggerRef,
    contentRef: panelRef,
    matchAnchorWidth: true,
    open: isOpen,
    preferredSide: "bottom"
  });

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const selectedIndex = options.findIndex((option) => option.value === selectedValue && !option.disabled);
    const firstEnabledIndex = options.findIndex((option) => !option.disabled);
    const focusIndex = selectedIndex >= 0 ? selectedIndex : firstEnabledIndex;

    optionRefs.current[focusIndex]?.focus();
  }, [isOpen, options, selectedValue]);

  function closeListbox() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function commitValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    const nativeSelect = nativeSelectRef.current;
    if (nativeSelect) {
      setNativeSelectValue(nativeSelect, nextValue);
    }

    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleNativeChange(event: ChangeEvent<HTMLSelectElement>) {
    if (!isControlled) {
      setInternalValue(event.currentTarget.value);
    }

    onChange?.(event);
  }

  function handleTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function handleOptionKeyDown(index: number) {
    return (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(optionRefs.current, index, 1);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(optionRefs.current, index, -1);
      }

      if (event.key === "Home") {
        event.preventDefault();
        optionRefs.current.find((option) => option && !option.disabled)?.focus();
      }

      if (event.key === "End") {
        event.preventDefault();
        [...optionRefs.current].reverse().find((option) => option && !option.disabled)?.focus();
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const option = options[index];
        if (!option || option.disabled) return;
        commitValue(option.value);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeListbox();
      }
    };
  }

  return (
    <div className={cx("ui-select", disabled && "is-disabled")} data-state={isOpen ? "open" : "closed"}>
      <button
        aria-controls={listboxId}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled ? "true" : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-required={required ? "true" : undefined}
        className={cx("form-control", "form-select", "ui-select-trigger", className)}
        disabled={disabled}
        id={triggerId}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className={cx("ui-select-value", !selectedOption && "is-placeholder")}>
          {selectedOption?.label ?? "请选择"}
        </span>
        <span aria-hidden="true" className="ui-select-icon">
          <ChevronDown className="ui-select-chevron" size={16} strokeWidth={1.8} />
        </span>
      </button>

      <select
        {...props}
        aria-hidden="true"
        className="ui-select-native"
        disabled={disabled}
        name={name}
        onChange={handleNativeChange}
        ref={mergeRefs(ref, nativeSelectRef)}
        required={required}
        tabIndex={-1}
        value={selectedValue}
      >
        {children}
      </select>

      {isOpen && portalRoot
        ? createPortal(
            <div
              aria-label={typeof ariaLabel === "string" ? ariaLabel : undefined}
              aria-labelledby={typeof ariaLabel === "string" ? undefined : triggerId}
              className={cx("ui-select-panel", `ui-select-panel-side-${resolvedSide}`)}
              data-side={resolvedSide}
              id={listboxId}
              ref={panelRef}
              role="listbox"
              style={style}
            >
              {options.map((option, index) => {
                const isSelected = option.value === selectedValue;

                return (
                  <button
                    aria-disabled={option.disabled ? "true" : undefined}
                    aria-selected={isSelected}
                    className="ui-select-option"
                    data-state={isSelected ? "selected" : "idle"}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => {
                      if (option.disabled) return;
                      commitValue(option.value);
                    }}
                    onKeyDown={handleOptionKeyDown(index)}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    role="option"
                    type="button"
                  >
                    <span className="ui-select-option-label">{option.label}</span>
                    <span aria-hidden="true" className="ui-select-option-check">
                      {isSelected ? <Check size={15} strokeWidth={2} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
});

