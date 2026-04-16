import { WemailToast } from "./WemailToast";
import type { WemailToastRecord } from "./toast";

type WemailToastViewportProps = {
  toasts: WemailToastRecord[];
  onDismissToast: (id: string) => void;
};

export function WemailToastViewport({ toasts, onDismissToast }: WemailToastViewportProps) {
  const visibleToasts = toasts.slice(0, 3);

  if (visibleToasts.length === 0) return null;

  return (
    <div aria-label="Notifications" aria-live="polite" className="wemail-toast-viewport" role="region">
      {visibleToasts.map((toast) => (
        <WemailToast key={toast.id} onDismiss={onDismissToast} toast={toast} />
      ))}
    </div>
  );
}
