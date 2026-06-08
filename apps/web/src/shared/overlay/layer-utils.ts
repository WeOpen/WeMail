import { type CSSProperties, type MutableRefObject, type Ref, useEffect, useLayoutEffect, useState } from "react";

export const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

type FloatingAlign = "start" | "center" | "end";
type FloatingSide = "top" | "bottom";

const PORTAL_ROOT_ID = "wemail-layer-root";
const INERT_COUNT_ATTR = "data-wemail-inert-count";
const PREV_ARIA_HIDDEN_ATTR = "data-wemail-prev-aria-hidden";
let portalRootUsageCount = 0;

function getPortalRoot() {
  let root = document.getElementById(PORTAL_ROOT_ID) as HTMLDivElement | null;

  if (!root) {
    root = document.createElement("div");
    root.id = PORTAL_ROOT_ID;
    document.body.appendChild(root);
  }

  return root;
}

function setElementInert(element: HTMLElement, inert: boolean) {
  const inertCapable = element as HTMLElement & { inert?: boolean };

  if ("inert" in inertCapable) {
    inertCapable.inert = inert;
  }
}

export function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

export function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled")
  );
}

export function usePortalRoot() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = getPortalRoot();
    portalRootUsageCount += 1;
    setPortalRoot(root);

    return () => {
      portalRootUsageCount = Math.max(portalRootUsageCount - 1, 0);
      if (portalRootUsageCount === 0 && root.childElementCount === 0) {
        root.remove();
      }
    };
  }, []);

  return portalRoot;
}

export function useOverlayAccessibility({
  active,
  panelRef,
  portalRoot
}: {
  active: boolean;
  panelRef: MutableRefObject<HTMLElement | null>;
  portalRoot: HTMLElement | null;
}) {
  useEffect(() => {
    if (!active || !panelRef.current || !portalRoot) {
      return undefined;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    const focusableElements = getFocusableElements(panel);
    const nextFocusTarget = focusableElements[0] ?? panel;
    nextFocusTarget.focus();

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const siblings = Array.from(body.children).filter((element) => element !== portalRoot) as HTMLElement[];

    siblings.forEach((element) => {
      const currentCount = Number(element.getAttribute(INERT_COUNT_ATTR) ?? "0");

      if (currentCount === 0) {
        element.setAttribute(PREV_ARIA_HIDDEN_ATTR, element.getAttribute("aria-hidden") ?? "");
        element.setAttribute("aria-hidden", "true");
        setElementInert(element, true);
      }

      element.setAttribute(INERT_COUNT_ATTR, String(currentCount + 1));
    });

    return () => {
      body.style.overflow = previousOverflow;

      siblings.forEach((element) => {
        const currentCount = Number(element.getAttribute(INERT_COUNT_ATTR) ?? "0");
        const nextCount = Math.max(currentCount - 1, 0);

        if (nextCount === 0) {
          const previousAriaHidden = element.getAttribute(PREV_ARIA_HIDDEN_ATTR) ?? "";
          if (previousAriaHidden === "") {
            element.removeAttribute("aria-hidden");
          } else {
            element.setAttribute("aria-hidden", previousAriaHidden);
          }
          element.removeAttribute(INERT_COUNT_ATTR);
          element.removeAttribute(PREV_ARIA_HIDDEN_ATTR);
          setElementInert(element, false);
        } else {
          element.setAttribute(INERT_COUNT_ATTR, String(nextCount));
        }
      });

      previousActiveElement?.focus();
    };
  }, [active, panelRef, portalRoot]);
}

export function useFloatingPosition({
  align = "start",
  anchorRef,
  matchAnchorWidth = false,
  offset = 10,
  open,
  preferredSide = "bottom",
  contentRef
}: {
  align?: FloatingAlign;
  anchorRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLElement | null>;
  matchAnchorWidth?: boolean;
  offset?: number;
  open: boolean;
  preferredSide?: FloatingSide;
}) {
  const [resolvedSide, setResolvedSide] = useState<FloatingSide>(preferredSide);
  const [style, setStyle] = useState<CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0
  });

  useLayoutEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const anchor = anchorRef.current;
      const content = contentRef.current;
      if (!anchor || !content) return;

      const anchorRect = anchor.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;

      let nextSide = preferredSide;

      if (
        preferredSide === "bottom" &&
        anchorRect.bottom + offset + contentRect.height > viewportHeight - margin &&
        anchorRect.top - offset - contentRect.height >= margin
      ) {
        nextSide = "top";
      }

      if (
        preferredSide === "top" &&
        anchorRect.top - offset - contentRect.height < margin &&
        anchorRect.bottom + offset + contentRect.height <= viewportHeight - margin
      ) {
        nextSide = "bottom";
      }

      let left =
        align === "center"
          ? anchorRect.left + anchorRect.width / 2 - contentRect.width / 2
          : align === "end"
            ? anchorRect.right - contentRect.width
            : anchorRect.left;

      let top =
        nextSide === "top" ? anchorRect.top - contentRect.height - offset : anchorRect.bottom + offset;

      left = Math.min(Math.max(left, margin), viewportWidth - contentRect.width - margin);
      top = Math.min(Math.max(top, margin), viewportHeight - contentRect.height - margin);

      setResolvedSide(nextSide);
      setStyle({
        position: "fixed",
        top,
        left,
        minWidth: matchAnchorWidth ? anchorRect.width : undefined
      });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, contentRef, matchAnchorWidth, offset, open, preferredSide]);

  return { resolvedSide, style };
}
