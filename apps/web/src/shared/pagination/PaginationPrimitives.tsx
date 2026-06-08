import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId
} from "react";

import { SelectInput } from "../form";

type PaginationProps = Omit<HTMLAttributes<HTMLElement>, "onChange"> & {
  onChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  siblings?: number;
  total: number;
};

type PaginationButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isCurrent?: boolean;
};

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function getPageCount(total: number, pageSize: number) {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

function buildPaginationItems(pageCount: number, currentPage: number, siblings: number): PaginationItem[] {
  if (pageCount <= 1) {
    return [1];
  }

  const safeSiblings = Math.max(0, siblings);
  const maxVisiblePages = safeSiblings * 2 + 5;

  if (pageCount <= maxVisiblePages) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const leftBoundary = Math.max(currentPage - safeSiblings, 2);
  const rightBoundary = Math.min(currentPage + safeSiblings, pageCount - 1);
  const items: PaginationItem[] = [1];

  if (leftBoundary > 2) {
    items.push("ellipsis-left");
  } else {
    for (let page = 2; page < leftBoundary; page += 1) {
      items.push(page);
    }
  }

  for (let page = leftBoundary; page <= rightBoundary; page += 1) {
    items.push(page);
  }

  if (rightBoundary < pageCount - 1) {
    items.push("ellipsis-right");
  } else {
    for (let page = rightBoundary + 1; page < pageCount; page += 1) {
      items.push(page);
    }
  }

  items.push(pageCount);

  return items;
}

function moveFocus(event: KeyboardEvent<HTMLUListElement>, focusableElements: HTMLElement[]) {
  const activeElement =
    event.currentTarget.ownerDocument.activeElement instanceof HTMLElement
      ? event.currentTarget.ownerDocument.activeElement
      : event.target instanceof HTMLElement
        ? event.target
        : null;
  const currentIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;

  if (focusableElements.length === 0) return;

  if (event.key === "Home") {
    focusableElements[0]?.focus();
    return;
  }

  if (event.key === "End") {
    focusableElements[focusableElements.length - 1]?.focus();
    return;
  }

  if (currentIndex === -1) {
    focusableElements[0]?.focus();
    return;
  }

  const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
  const nextIndex = clamp(currentIndex + direction, 0, focusableElements.length - 1);
  focusableElements[nextIndex]?.focus();
}

const PaginationButton = forwardRef<HTMLButtonElement, PaginationButtonProps>(function PaginationButton(
  { children, className, disabled, isCurrent, type = "button", ...props },
  ref
) {
  return (
    <button
      {...props}
      aria-current={isCurrent ? "page" : undefined}
      className={cx(
        "ui-pagination-button",
        isCurrent && "is-current",
        disabled && "is-disabled",
        className
      )}
      data-pagination-focusable="true"
      data-state={isCurrent ? "current" : "inactive"}
      disabled={disabled}
      ref={ref}
      type={type}
    >
      {children}
    </button>
  );
});

export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    "aria-label": ariaLabel = "分页导航",
    className,
    onChange,
    onPageSizeChange,
    page,
    pageSize,
    pageSizeOptions,
    siblings = 1,
    total,
    ...props
  },
  ref
) {
  const pageSizeSelectId = useId();
  const pageCount = getPageCount(total, pageSize);
  const currentPage = clamp(page, 1, pageCount);
  const items = buildPaginationItems(pageCount, currentPage, siblings);
  const hasPageSizeOptions = Boolean(pageSizeOptions?.length);

  function handlePageChange(nextPage: number) {
    const resolvedPage = clamp(nextPage, 1, pageCount);
    if (resolvedPage === currentPage) return;
    onChange?.(resolvedPage);
  }

  function handlePageSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextPageSize = Number(event.currentTarget.value);
    if (!Number.isFinite(nextPageSize)) return;
    onPageSizeChange?.(nextPageSize);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;

    event.preventDefault();

    const focusableElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-pagination-focusable=\"true\"]")
    ).filter((element) => {
      return !(element instanceof HTMLButtonElement && element.disabled);
    });

    moveFocus(event, focusableElements);
  }

  return (
    <nav
      {...props}
      aria-label={ariaLabel}
      className={cx("ui-pagination", hasPageSizeOptions && "ui-pagination-with-meta", className)}
      data-state={pageCount <= 1 ? "single" : "ready"}
      ref={ref}
    >
      {hasPageSizeOptions ? (
        <div className="ui-pagination-meta">
          <span className="ui-pagination-total">共 {total} 条</span>
          <div className="ui-pagination-size">
            <label className="ui-pagination-size-label" htmlFor={pageSizeSelectId}>
              每页条数
            </label>
            <SelectInput
              aria-label="每页条数"
              className="ui-pagination-size-select"
              disabled={!onPageSizeChange}
              id={pageSizeSelectId}
              onChange={handlePageSizeChange}
              value={pageSize}
            >
              {pageSizeOptions?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectInput>
          </div>
        </div>
      ) : null}

      <ul className="ui-pagination-list" onKeyDown={handleKeyDown}>
        <li className="ui-pagination-item">
          <PaginationButton
            aria-label="上一页"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            上一页
          </PaginationButton>
        </li>

        {items.map((item, index) => {
          if (typeof item !== "number") {
            return (
              <li aria-hidden="true" className="ui-pagination-item" key={`${item}-${index}`}>
                <span className="ui-pagination-ellipsis" data-state="ellipsis">
                  …
                </span>
              </li>
            );
          }

          return (
            <li className="ui-pagination-item" key={item}>
              <PaginationButton
                aria-label={`第 ${item} 页`}
                isCurrent={item === currentPage}
                onClick={() => handlePageChange(item)}
              >
                {item}
              </PaginationButton>
            </li>
          );
        })}

        <li className="ui-pagination-item">
          <PaginationButton
            aria-label="下一页"
            disabled={currentPage >= pageCount}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            下一页
          </PaginationButton>
        </li>
      </ul>
    </nav>
  );
});
