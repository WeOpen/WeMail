import {
  cloneElement,
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type ReactElement,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type UIEvent as ReactUIEvent
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import { useFloatingPosition, usePortalRoot } from "../overlay/layer-utils";

type FormTone = "default" | "error" | "success";
type FormCheckVariant = "inline" | "card";

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

type DateInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  calendarLabel?: string;
  clearLabel?: string;
  doneLabel?: string;
  onValueChange?: (value: string) => void;
  showTime?: boolean;
  timeLabel?: string;
  todayLabel?: string;
};

type DateTimeInputProps = Omit<DateInputProps, "showTime">;

type CalendarViewMode = "day" | "month" | "year";
type TimePart = "hours" | "minutes";

type SelectOptionRecord = {
  disabled?: boolean;
  label: ReactNode;
  textValue: string;
  value: string;
};

export type MultiSelectOption = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function mergeIds(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ") || undefined;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (value: T) => {
    refs.forEach((ref) => assignRef(ref, value));
  };
}

function setNativeInputValue(input: HTMLInputElement, nextValue: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setNativeSelectValue(select: HTMLSelectElement, nextValue: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(select, nextValue);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function getTextValue(node: ReactNode): string {
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

function getSelectOptions(children: ReactNode): SelectOptionRecord[] {
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

function normalizeSelectValue(value: SelectHTMLAttributes<HTMLSelectElement>["value"] | SelectHTMLAttributes<HTMLSelectElement>["defaultValue"]) {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === undefined || value === null) return undefined;
  return String(value);
}

const dateWeekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];
const dateMonthFormatter = new Intl.DateTimeFormat("zh-CN", {
  month: "long",
  year: "numeric"
});
const dateAccessibleFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "numeric",
  month: "long",
  year: "numeric"
});
const dateMonthNames = Array.from({ length: 12 }, (_, monthIndex) => `${monthIndex + 1}月`);
const timeHourOptions = Array.from({ length: 24 }, (_, hour) => padDatePart(hour));
const timeMinuteOptions = Array.from({ length: 60 }, (_, minute) => padDatePart(minute));

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseDateValue(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

function parseDateTimeValue(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(value)) return null;

  const [datePart, timePart] = value.split(/[T ]/);
  const date = parseDateValue(datePart);
  if (!date) return null;

  const [hourPart, minutePart] = timePart.split(":");
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

function parseDateLikeValue(value: unknown) {
  if (typeof value !== "string") return null;

  return parseDateTimeValue(value) ?? parseDateValue(value) ?? parseDateValue(value.split("T")[0] ?? "");
}

function formatDateTimeValue(date: Date) {
  return `${formatDateValue(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}

function formatDateTimeDisplayValue(value: string) {
  const parsedDate = parseDateTimeValue(value);
  if (!parsedDate) return value;
  return formatDateTimeValue(parsedDate).replace("T", " ");
}

function normalizeDateTimeInputValue(value: string) {
  const parsedDate = parseDateTimeValue(value);
  if (!parsedDate) return value;
  return formatDateTimeValue(parsedDate);
}

function getTimePartsFromDateTime(value: string) {
  const parsedDate = parseDateTimeValue(value);
  if (parsedDate) {
    return {
      hours: padDatePart(parsedDate.getHours()),
      minutes: padDatePart(parsedDate.getMinutes())
    };
  }

  const timeMatch = value.match(/[T ](?<hours>\d{0,2}):?(?<minutes>\d{0,2})?/);
  return {
    hours: timeMatch?.groups?.hours?.padStart(2, "0").slice(0, 2) ?? "09",
    minutes: timeMatch?.groups?.minutes?.padStart(2, "0").slice(0, 2) ?? "00"
  };
}

function normalizeTimePart(part: string, max: number) {
  const numericValue = Number(part || "0");
  if (!Number.isFinite(numericValue)) return "00";
  return padDatePart(Math.min(Math.max(numericValue, 0), max));
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDays(monthDate: Date) {
  const monthStart = getMonthStart(monthDate);
  const gridStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => (
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)
  ));
}

function isSameCalendarDate(left: Date | null, right: Date | null) {
  if (!left || !right) return false;

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
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

function renderFormCheck(
  type: "checkbox" | "radio",
  inputId: string,
  {
    className,
    description,
    inputClassName,
    label,
    variant = "inline",
    ...props
  }: FormCheckProps,
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

function getMultiSelectSummary(selectedValues: string[], options: MultiSelectOption[], placeholder: ReactNode) {
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

function moveFocus(optionRefs: Array<HTMLElement | null>, startIndex: number, step: 1 | -1) {
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

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    "aria-label": ariaLabel,
    autoComplete = "off",
    calendarLabel = "打开日期选择器",
    className,
    clearLabel = "清空日期",
    defaultValue,
    disabled,
    doneLabel = "完成",
    id,
    inputMode,
    onChange,
    onClick,
    onFocus,
    onKeyDown,
    onValueChange,
    pattern,
    placeholder,
    readOnly,
    showTime = false,
    spellCheck = false,
    timeLabel = "时间",
    todayLabel = "今天",
    value,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const calendarId = `${inputId}-calendar`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hourWheelRef = useRef<HTMLDivElement>(null);
  const minuteWheelRef = useRef<HTMLDivElement>(null);
  const isProgrammaticChangeRef = useRef(false);
  const suppressNextFocusOpenRef = useRef(false);
  const timeWheelScrollTimeoutsRef = useRef<Record<TimePart, number | null>>({
    hours: null,
    minutes: null
  });
  const portalRoot = usePortalRoot();
  const initialValue = Array.isArray(defaultValue) ? String(defaultValue[0] ?? "") : defaultValue?.toString() ?? "";
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(initialValue);
  const currentValue = isControlled
    ? Array.isArray(value)
      ? String(value[0] ?? "")
      : value?.toString() ?? ""
    : uncontrolledValue;
  const displayValue = showTime ? formatDateTimeDisplayValue(currentValue) : currentValue;
  const displayDefaultValue = showTime
    ? Array.isArray(defaultValue)
      ? defaultValue.map((item) => formatDateTimeDisplayValue(String(item)))
      : defaultValue === undefined || defaultValue === null
        ? defaultValue
        : formatDateTimeDisplayValue(String(defaultValue))
    : defaultValue;
  const selectedDate = useMemo(() => parseDateLikeValue(currentValue), [currentValue]);
  const timeParts = getTimePartsFromDateTime(currentValue);
  const [hourDraft, setHourDraft] = useState(timeParts.hours);
  const [minuteDraft, setMinuteDraft] = useState(timeParts.minutes);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(selectedDate ?? new Date()));
  const [isOpen, setIsOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("day");
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);
  const yearRangeStart = Math.floor(visibleMonth.getFullYear() / 12) * 12;
  const visibleYears = useMemo(() => Array.from({ length: 12 }, (_, index) => yearRangeStart + index), [yearRangeStart]);
  const monthLabel = dateMonthFormatter.format(visibleMonth);
  const resolvedInputMode = inputMode ?? (showTime ? "text" : "numeric");
  const resolvedPattern = pattern ?? (showTime ? "\\d{4}-\\d{2}-\\d{2}([T ]\\d{2}:\\d{2})?" : "\\d{4}-\\d{2}-\\d{2}");
  const resolvedPlaceholder = placeholder ?? (showTime ? "2026-07-01 09:00" : "2026-07-01…");
  const today = new Date();
  const { resolvedSide, style } = useFloatingPosition({
    anchorRef: rootRef,
    contentRef: panelRef,
    matchAnchorWidth: false,
    offset: 8,
    open: isOpen,
    preferredSide: "bottom"
  });

  const scrollTimeWheel = useCallback((part: TimePart, nextValue: string, behavior: ScrollBehavior = "smooth") => {
    const container = part === "hours" ? hourWheelRef.current : minuteWheelRef.current;
    if (!container) return;

    const option = container.querySelector<HTMLElement>(`[data-time-value="${nextValue}"]`);
    if (!option) return;

    const nextScrollTop = option.offsetTop - (container.clientHeight - option.offsetHeight) / 2;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ behavior, top: nextScrollTop });
      return;
    }

    container.scrollTop = nextScrollTop;
  }, []);

  useEffect(() => {
    if (!showTime) return;
    setHourDraft(timeParts.hours);
    setMinuteDraft(timeParts.minutes);
  }, [showTime, timeParts.hours, timeParts.minutes]);

  useEffect(() => {
    const timeWheelScrollTimeouts = timeWheelScrollTimeoutsRef.current;

    return () => {
      Object.values(timeWheelScrollTimeouts).forEach((timeoutId) => {
        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !showTime) return;

    const animationFrame = window.requestAnimationFrame(() => {
      scrollTimeWheel("hours", hourDraft, "auto");
      scrollTimeWheel("minutes", minuteDraft, "auto");
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [hourDraft, isOpen, minuteDraft, scrollTimeWheel, showTime]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setVisibleMonth(getMonthStart(selectedDate ?? new Date()));
    setCalendarView("day");
  }, [isOpen, selectedDate]);

  function openCalendar() {
    if (disabled || readOnly) return;
    setVisibleMonth(getMonthStart(selectedDate ?? new Date()));
    setCalendarView("day");
    setIsOpen(true);
  }

  function closeCalendar({ restoreFocus = false } = {}) {
    setIsOpen(false);
    if (restoreFocus) {
      suppressNextFocusOpenRef.current = true;
      inputRef.current?.focus();
      window.setTimeout(() => {
        suppressNextFocusOpenRef.current = false;
      }, 0);
    }
  }

  function commitValue(nextValue: string, { close = !showTime } = {}) {
    const storedValue = showTime ? normalizeDateTimeInputValue(nextValue) : nextValue;
    const nextDate = parseDateLikeValue(storedValue);

    if (!isControlled) {
      setUncontrolledValue(storedValue);
    }

    if (nextDate) {
      setVisibleMonth(getMonthStart(nextDate));
    }

    const input = inputRef.current;
    if (input) {
      isProgrammaticChangeRef.current = true;
      setNativeInputValue(input, showTime ? formatDateTimeDisplayValue(storedValue) : storedValue);
      isProgrammaticChangeRef.current = false;
    }

    onValueChange?.(storedValue);
    if (close) {
      closeCalendar({ restoreFocus: true });
    }
  }

  function buildDateTimeValue(dateValue: string, nextHours = hourDraft, nextMinutes = minuteDraft) {
    return `${dateValue}T${normalizeTimePart(nextHours, 23)}:${normalizeTimePart(nextMinutes, 59)}`;
  }

  function commitDateValue(nextDateValue: string, { close = !showTime } = {}) {
    commitValue(showTime && nextDateValue ? buildDateTimeValue(nextDateValue) : nextDateValue, { close });
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.currentTarget.value;
    const storedValue = showTime ? normalizeDateTimeInputValue(nextValue) : nextValue;

    if (!isControlled) {
      setUncontrolledValue(storedValue);
    }

    const nextDate = parseDateLikeValue(storedValue);
    if (nextDate) {
      setVisibleMonth(getMonthStart(nextDate));
    }

    if (showTime) {
      const nextTimeParts = getTimePartsFromDateTime(storedValue);
      setHourDraft(nextTimeParts.hours);
      setMinuteDraft(nextTimeParts.minutes);
    }

    onChange?.(event);

    if (!isProgrammaticChangeRef.current) {
      onValueChange?.(storedValue);
    }
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      openCalendar();
    }

    if (event.key === "Escape") {
      closeCalendar();
    }
  }

  function handleDayKeyDown(index: number) {
    return (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const dayButtons = Array.from(panelRef.current?.querySelectorAll<HTMLButtonElement>(".ui-date-picker-day") ?? []);
      const focusDay = (nextIndex: number) => dayButtons[nextIndex]?.focus();

      if (event.key === "ArrowRight") {
        event.preventDefault();
        focusDay(Math.min(index + 1, dayButtons.length - 1));
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        focusDay(Math.max(index - 1, 0));
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusDay(Math.min(index + 7, dayButtons.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusDay(Math.max(index - 7, 0));
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusDay(0);
      }

      if (event.key === "End") {
        event.preventDefault();
        focusDay(dayButtons.length - 1);
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeCalendar({ restoreFocus: true });
      }
    };
  }

  function commitCurrentTime(nextHours = hourDraft, nextMinutes = minuteDraft, { close = false } = {}) {
    if (!selectedDate) return;
    commitValue(buildDateTimeValue(formatDateValue(selectedDate), nextHours, nextMinutes), { close });
  }

  function getTimeWheelOptions(part: TimePart) {
    return part === "hours" ? timeHourOptions : timeMinuteOptions;
  }

  function getClosestTimeWheelValue(container: HTMLDivElement) {
    const options = Array.from(container.querySelectorAll<HTMLElement>("[data-time-value]"));
    if (options.length === 0) return null;

    const center = container.scrollTop + container.clientHeight / 2;
    const closestOption = options.reduce((closest, option) => {
      const closestDistance = Math.abs(closest.offsetTop + closest.offsetHeight / 2 - center);
      const optionDistance = Math.abs(option.offsetTop + option.offsetHeight / 2 - center);
      return optionDistance < closestDistance ? option : closest;
    }, options[0]);

    return closestOption.dataset.timeValue ?? null;
  }

  function commitTimePart(part: TimePart, nextValue: string, { scroll = true } = {}) {
    const normalizedValue = normalizeTimePart(nextValue, part === "hours" ? 23 : 59);
    const nextHours = part === "hours" ? normalizedValue : hourDraft;
    const nextMinutes = part === "minutes" ? normalizedValue : minuteDraft;

    if (part === "hours") {
      setHourDraft(normalizedValue);
    } else {
      setMinuteDraft(normalizedValue);
    }

    if (selectedDate) {
      commitCurrentTime(nextHours, nextMinutes);
    }

    if (scroll) {
      scrollTimeWheel(part, normalizedValue);
    }
  }

  function handleTimeWheelScroll(part: TimePart) {
    return (event: ReactUIEvent<HTMLDivElement>) => {
      const timeoutId = timeWheelScrollTimeoutsRef.current[part];
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      const container = event.currentTarget;
      timeWheelScrollTimeoutsRef.current[part] = window.setTimeout(() => {
        const nextValue = getClosestTimeWheelValue(container);
        if (nextValue) {
          commitTimePart(part, nextValue, { scroll: true });
        }
      }, 90);
    };
  }

  function handleTimeWheelKeyDown(part: TimePart) {
    return (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCalendar({ restoreFocus: true });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        closeCalendar({ restoreFocus: true });
        return;
      }

      const options = getTimeWheelOptions(part);
      const currentValue = part === "hours" ? hourDraft : minuteDraft;
      const currentIndex = Math.max(0, options.indexOf(currentValue));
      let nextIndex = currentIndex;

      if (event.key === "ArrowDown") nextIndex = Math.min(currentIndex + 1, options.length - 1);
      if (event.key === "ArrowUp") nextIndex = Math.max(currentIndex - 1, 0);
      if (event.key === "PageDown") nextIndex = Math.min(currentIndex + 5, options.length - 1);
      if (event.key === "PageUp") nextIndex = Math.max(currentIndex - 5, 0);
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = options.length - 1;

      if (nextIndex === currentIndex) return;

      event.preventDefault();
      commitTimePart(part, options[nextIndex]);
    };
  }

  return (
    <div
      className={cx("ui-date-input", disabled && "is-disabled", readOnly && "is-readonly", className)}
      data-state={isOpen ? "open" : "closed"}
      data-time={showTime ? "true" : undefined}
      ref={rootRef}
    >
      <input
        {...props}
        aria-controls={isOpen ? calendarId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        className="form-control ui-date-input-control"
        defaultValue={isControlled ? undefined : displayDefaultValue}
        disabled={disabled}
        id={inputId}
        inputMode={resolvedInputMode}
        onChange={handleInputChange}
        onClick={(event) => {
          onClick?.(event);
          openCalendar();
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (suppressNextFocusOpenRef.current) return;
          openCalendar();
        }}
        onKeyDown={handleInputKeyDown}
        pattern={resolvedPattern}
        placeholder={resolvedPlaceholder}
        readOnly={readOnly}
        ref={mergeRefs(ref, inputRef)}
        spellCheck={spellCheck}
        type="text"
        value={isControlled ? displayValue : undefined}
      />
      <button
        aria-controls={calendarId}
        aria-expanded={isOpen}
        aria-label={calendarLabel}
        className="ui-date-input-trigger"
        disabled={disabled || readOnly}
        onClick={() => {
          if (isOpen) {
            closeCalendar();
            return;
          }
          openCalendar();
        }}
        type="button"
      >
        <CalendarDays aria-hidden="true" size={16} strokeWidth={1.9} />
      </button>

      {isOpen && portalRoot
        ? createPortal(
            <div
              aria-label={typeof ariaLabel === "string" ? `${ariaLabel}日历` : "日期选择日历"}
              className={cx("ui-date-picker-panel", `ui-date-picker-panel-side-${resolvedSide}`)}
              data-mode={showTime ? "datetime" : "date"}
              data-side={resolvedSide}
              id={calendarId}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeCalendar({ restoreFocus: true });
                }
              }}
              ref={panelRef}
              role="dialog"
              style={style}
            >
              <div className="ui-date-picker-body">
                <div className="ui-date-picker-calendar">
                  <div className="ui-date-picker-header">
                    <button
                      aria-label={calendarView === "year" ? "上一组年份" : calendarView === "month" ? "上一年" : "上个月"}
                      className="ui-date-picker-nav"
                      onClick={() => {
                        setVisibleMonth((currentMonth) => (
                          calendarView === "year"
                            ? new Date(currentMonth.getFullYear() - 12, currentMonth.getMonth(), 1)
                            : calendarView === "month"
                              ? new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1)
                              : addMonths(currentMonth, -1)
                        ));
                      }}
                      type="button"
                    >
                      <ChevronLeft aria-hidden="true" size={17} strokeWidth={2} />
                    </button>
                    <button
                      aria-label={calendarView === "year" ? "选择年份范围" : calendarView === "month" ? "切换到年份选择" : "切换到月份选择"}
                      className="ui-date-picker-heading"
                      onClick={() => {
                        if (calendarView === "day") {
                          setCalendarView("month");
                          return;
                        }
                        if (calendarView === "month") {
                          setCalendarView("year");
                        }
                      }}
                      type="button"
                    >
                      {calendarView === "year" ? `${yearRangeStart} - ${yearRangeStart + 11}` : calendarView === "month" ? `${visibleMonth.getFullYear()}年` : monthLabel}
                    </button>
                    <button
                      aria-label={calendarView === "year" ? "下一组年份" : calendarView === "month" ? "下一年" : "下个月"}
                      className="ui-date-picker-nav"
                      onClick={() => {
                        setVisibleMonth((currentMonth) => (
                          calendarView === "year"
                            ? new Date(currentMonth.getFullYear() + 12, currentMonth.getMonth(), 1)
                            : calendarView === "month"
                              ? new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1)
                              : addMonths(currentMonth, 1)
                        ));
                      }}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" size={17} strokeWidth={2} />
                    </button>
                  </div>
                  {calendarView === "day" ? (
                    <>
                      <div className="ui-date-picker-weekdays" aria-hidden="true">
                        {dateWeekdayLabels.map((weekday) => (
                          <span key={weekday}>{weekday}</span>
                        ))}
                      </div>
                      <div className="ui-date-picker-grid" aria-label={monthLabel}>
                        {calendarDays.map((day, index) => {
                          const dateValue = formatDateValue(day);
                          const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
                          const isSelected = isSameCalendarDate(day, selectedDate);
                          const isToday = isSameCalendarDate(day, today);

                          return (
                            <button
                              aria-current={isToday ? "date" : undefined}
                              aria-label={`选择 ${dateAccessibleFormatter.format(day)}`}
                              aria-selected={isSelected}
                              className="ui-date-picker-day"
                              data-month={isOutsideMonth ? "adjacent" : "current"}
                              data-state={isSelected ? "selected" : isToday ? "today" : "idle"}
                              key={`${dateValue}-${index}`}
                              onClick={() => commitDateValue(dateValue)}
                              onKeyDown={handleDayKeyDown(index)}
                              type="button"
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : calendarView === "month" ? (
                    <div className="ui-date-picker-choice-grid" aria-label={`${visibleMonth.getFullYear()}年月份`}>
                      {dateMonthNames.map((monthName, monthIndex) => (
                        <button
                          aria-selected={monthIndex === visibleMonth.getMonth()}
                          className="ui-date-picker-choice"
                          data-state={monthIndex === visibleMonth.getMonth() ? "selected" : "idle"}
                          key={monthName}
                          onClick={() => {
                            setVisibleMonth((currentMonth) => new Date(currentMonth.getFullYear(), monthIndex, 1));
                            setCalendarView("day");
                          }}
                          type="button"
                        >
                          {monthName}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="ui-date-picker-choice-grid" aria-label="年份">
                      {visibleYears.map((year) => (
                        <button
                          aria-selected={year === visibleMonth.getFullYear()}
                          className="ui-date-picker-choice"
                          data-state={year === visibleMonth.getFullYear() ? "selected" : "idle"}
                          key={year}
                          onClick={() => {
                            setVisibleMonth((currentMonth) => new Date(year, currentMonth.getMonth(), 1));
                            setCalendarView("month");
                          }}
                          type="button"
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {showTime ? (
                  <div className="ui-date-picker-time" aria-label={timeLabel}>
                    <span className="ui-date-picker-time-label">{timeLabel}</span>
                    <div className="ui-date-picker-time-wheels" aria-label={timeLabel}>
                      <div
                        aria-activedescendant={`${calendarId}-hour-${hourDraft}`}
                        aria-label="小时"
                        className="ui-date-picker-time-wheel"
                        onKeyDown={handleTimeWheelKeyDown("hours")}
                        onScroll={handleTimeWheelScroll("hours")}
                        ref={hourWheelRef}
                        role="listbox"
                        tabIndex={0}
                      >
                        {timeHourOptions.map((hour) => (
                          <button
                            aria-label={`${hour}小时`}
                            aria-selected={hour === hourDraft}
                            className="ui-date-picker-time-option"
                            data-state={hour === hourDraft ? "selected" : "idle"}
                            data-time-value={hour}
                            id={`${calendarId}-hour-${hour}`}
                            key={hour}
                            onClick={() => commitTimePart("hours", hour)}
                            role="option"
                            type="button"
                          >
                            {hour}
                          </button>
                        ))}
                      </div>
                      <span aria-hidden="true" className="ui-date-picker-time-separator">
                        :
                      </span>
                      <div
                        aria-activedescendant={`${calendarId}-minute-${minuteDraft}`}
                        aria-label="分钟"
                        className="ui-date-picker-time-wheel"
                        onKeyDown={handleTimeWheelKeyDown("minutes")}
                        onScroll={handleTimeWheelScroll("minutes")}
                        ref={minuteWheelRef}
                        role="listbox"
                        tabIndex={0}
                      >
                        {timeMinuteOptions.map((minute) => (
                          <button
                            aria-label={`${minute}分钟`}
                            aria-selected={minute === minuteDraft}
                            className="ui-date-picker-time-option"
                            data-state={minute === minuteDraft ? "selected" : "idle"}
                            data-time-value={minute}
                            id={`${calendarId}-minute-${minute}`}
                            key={minute}
                            onClick={() => commitTimePart("minutes", minute)}
                            role="option"
                            type="button"
                          >
                            {minute}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="ui-date-picker-actions">
                <button
                  className="ui-date-picker-action"
                  disabled={!currentValue}
                  onClick={() => commitValue("", { close: true })}
                  type="button"
                >
                  {clearLabel}
                </button>
                <div className="ui-date-picker-action-group">
                  <button
                    className="ui-date-picker-action"
                    onClick={() => commitDateValue(formatDateValue(new Date()))}
                    type="button"
                  >
                    {todayLabel}
                  </button>
                  {showTime ? (
                    <button
                      className="ui-date-picker-action is-primary"
                      onClick={() => closeCalendar({ restoreFocus: true })}
                      type="button"
                    >
                      {doneLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>,
            portalRoot
          )
        : null}
    </div>
  );
});

export const DateTimeInput = forwardRef<HTMLInputElement, DateTimeInputProps>(function DateTimeInput(props, ref) {
  return <DateInput {...props} ref={ref} showTime />;
});

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
