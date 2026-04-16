import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WemailLogo } from "../shared/WemailLogo";

describe("brand assets", () => {
  it("adds a centered wax seal to the React logo mark", () => {
    const markup = renderToStaticMarkup(createElement(WemailLogo));

    expect(markup).toContain('x="3.5" y="10.5" width="57" height="41" rx="14.5"');
    expect(markup).toContain('stroke-linecap="round"');
    expect(markup).toContain('cx="32" cy="40.5" fill="var(--accent, currentColor)" r="9"');
    expect(markup).toContain('d="M26.6 43.6V34.4L32 41L37.4 34.4V43.6"');
  });

  it("uses a tighter favicon composition with a centered wax seal for better small-size legibility", () => {
    const faviconPath = resolve(process.cwd(), "public", "brand", "favicon.svg");
    const svg = readFileSync(faviconPath, "utf8");

    expect(svg).toContain('rect x="2" y="8.5" width="60" height="44" rx="16"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('circle cx="32" cy="41" r="10"');
  });

  it("keeps the shared icon asset in sync with the sealed-envelope mark", () => {
    const iconPath = resolve(process.cwd(), "public", "brand", "icon.svg");
    const svg = readFileSync(iconPath, "utf8");

    expect(svg).toContain('rect x="8" y="22" width="112" height="80" rx="28"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('circle cx="64" cy="80.5" r="18"');
    expect(svg).toContain('d="M53.2 88V69L64 82.5L74.8 69V88"');
  });

  it("keeps the mono icon seal as a line-drawn M", () => {
    const iconPath = resolve(process.cwd(), "public", "brand", "icon-mono.svg");
    const svg = readFileSync(iconPath, "utf8");

    expect(svg).toContain('rect x="3.5" y="10.5" width="57" height="41" rx="14.5"');
    expect(svg).toContain('circle cx="32" cy="40.5" r="9" fill="none"');
    expect(svg).toContain('d="M26.6 43.6V34.4L32 41L37.4 34.4V43.6"');
  });
});
