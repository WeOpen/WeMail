import { useEffect, useRef, useState, type ReactNode } from "react";

type ViewportDeferredProps = {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
};

export function ViewportDeferred({ children, fallback, rootMargin = "240px 0px" }: ViewportDeferredProps) {
  const [shouldRender, setShouldRender] = useState(
    () => typeof window === "undefined" || !("IntersectionObserver" in window)
  );
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldRender) return;
    const placeholder = placeholderRef.current;
    if (!placeholder) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin }
    );

    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  if (shouldRender) return <>{children}</>;

  return (
    <div className="viewport-deferred-placeholder" ref={placeholderRef}>
      {fallback}
    </div>
  );
}
