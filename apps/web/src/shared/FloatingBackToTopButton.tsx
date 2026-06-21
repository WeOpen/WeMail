import { ArrowUp } from "lucide-react";

import { Button } from "./button";
import { Icon } from "./icon";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function FloatingBackToTopButton({ className }: { className?: string }) {
  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <Button
      aria-label="返回顶部"
      className={cx("floating-back-to-top", className)}
      iconOnly
      onClick={handleBackToTop}
      size="lg"
      variant="icon"
    >
      <Icon decorative icon={ArrowUp} size="md" />
    </Button>
  );
}
