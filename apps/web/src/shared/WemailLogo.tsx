import type { ImgHTMLAttributes } from "react";

type WemailLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> & {
  title?: string;
};

export function WemailLogo({ title = "WeMail logo", ...props }: WemailLogoProps) {
  return (
    <img
      alt={title}
      aria-hidden={title ? undefined : true}
      src="/brand/WeMail.png"
      {...props}
    />
  );
}
