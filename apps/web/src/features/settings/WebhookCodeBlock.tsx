import { Copy } from "lucide-react";

import { Button } from "../../shared/button";

export type WebhookCodeBlockProps = {
  copied: boolean;
  copyLabel: string;
  label: string;
  onCopy: () => void;
  value: string;
};


export function WebhookCodeBlock({ copied, copyLabel, label, onCopy, value }: WebhookCodeBlockProps) {
  return (
    <article className="webhook-code-card">
      <div className="webhook-code-header">
        <span>{label}</span>
        <Button
          aria-label={copyLabel}
          leadingIcon={<Copy size={14} strokeWidth={1.9} />}
          onClick={onCopy}
          size="sm"
          variant="secondary"
        >
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre>
        <code>{value}</code>
      </pre>
    </article>
  );
}
