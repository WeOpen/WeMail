import type { SVGProps } from "react";

type WemailLogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function WemailLogo({ title = "WeMail logo", ...props }: WemailLogoProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      fill="none"
      role="img"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        className="wemail-logo-envelope"
        x="3.5"
        y="10.5"
        width="57"
        height="41"
        rx="14.5"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="wemail-logo-envelope"
        d="M9.5 18.5L23 30.75L32 24.25L41 30.75L54.5 18.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        className="wemail-logo-fold"
        d="M23 30.75L32 24.25L41 30.75"
        stroke="var(--accent, currentColor)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        className="wemail-logo-envelope"
        d="M10 46.5L24.5 32.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        className="wemail-logo-envelope"
        d="M54 46.5L39.5 32.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <g className="wemail-logo-seal-group">
        <circle
          className="wemail-logo-seal"
          cx="32"
          cy="40.5"
          fill="var(--accent, currentColor)"
          r="9"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="wemail-logo-monogram"
          d="M26.6 43.6V34.4L32 41L37.4 34.4V43.6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.35"
        />
      </g>
    </svg>
  );
}