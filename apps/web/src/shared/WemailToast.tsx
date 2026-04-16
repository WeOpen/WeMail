import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";

import type { WemailToastRecord } from "./toast";

const EXIT_DURATION_MS = 220;

type WemailToastProps = {
  toast: WemailToastRecord;
  onDismiss: (id: string) => void;
};

function ToastIcon({ tone }: { tone: WemailToastRecord["tone"] }) {
  const props = {
    absoluteStrokeWidth: true,
    "aria-hidden": true as const,
    className: "wemail-toast-icon-svg",
    strokeWidth: 1.9
  };

  switch (tone) {
    case "error":
      return <X {...props} />;
    case "info":
      return <Info {...props} />;
    default:
      return <CheckCircle2 {...props} />;
  }
}

export function WemailToast({ toast, onDismiss }: WemailToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);
  const dismissTimerRef = useRef<number | null>(null);

  const finalizeDismiss = useCallback(() => {
    onDismiss(toast.id);
  }, [onDismiss, toast.id]);

  const requestDismiss = useCallback(() => {
    if (isLeaving) return;
    setIsLeaving(true);
    dismissTimerRef.current = window.setTimeout(finalizeDismiss, EXIT_DURATION_MS);
  }, [finalizeDismiss, isLeaving]);

  useEffect(() => {
    if (toast.durationMs == null || isLeaving) return;

    const timeout = window.setTimeout(requestDismiss, toast.durationMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLeaving, requestDismiss, toast.durationMs]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  return (
    <article
      aria-atomic="true"
      className={`wemail-toast ${toast.tone}${isLeaving ? " leaving" : ""}`}
      role={toast.tone === "error" ? "alert" : "status"}
    >
      <span className="wemail-toast-icon" aria-hidden="true">
        <ToastIcon tone={toast.tone} />
      </span>

      <div className="wemail-toast-copy">
        <p className="wemail-toast-message">{toast.message}</p>
      </div>

      {toast.dismissible ? (
        <button
          aria-label="Dismiss toast"
          className="wemail-toast-close"
          onClick={requestDismiss}
          type="button"
        >
          <X absoluteStrokeWidth aria-hidden="true" className="wemail-toast-close-icon" strokeWidth={1.8} />
        </button>
      ) : null}
    </article>
  );
}
