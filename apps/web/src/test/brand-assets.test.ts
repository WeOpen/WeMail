import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WemailLogo } from "../shared/WemailLogo";

function readPngSize(path: string) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`Expected PNG signature for ${path}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

describe("brand assets", () => {
  it("renders the shared WeMail PNG as the React logo mark", () => {
    const markup = renderToStaticMarkup(createElement(WemailLogo));

    expect(markup).toContain('src="/brand/WeMail.png"');
    expect(markup).toContain('alt="WeMail logo"');
  });

  it("scales the auth, landing, and workspace brand lockups up with restrained larger sizing", () => {
    const css = readFileSync(resolve(process.cwd(), "src", "shared", "styles", "index.css"), "utf8");

    expect(css).toMatch(/\.auth-brand-logo\s*\{\s*width: 112px;\s*height: 112px;/m);
    expect(css).toMatch(/\.auth-brand-wordmark\s*\{\s*font-size: 2rem;/m);
    expect(css).toMatch(/\.auth-brand-mark\s*\{[\s\S]*?width: 144px;[\s\S]*?height: 144px;/m);
    expect(css).toMatch(
      /\.landing-nav-bar \.landing-brand-lockup\.compact \.wemail-brand-lockup-logo,[\s\S]*?width: 38px;[\s\S]*?height: 38px;/m
    );
    expect(css).toMatch(/\.landing-nav-bar \.landing-brand-lockup \.wemail-wordmark,[\s\S]*?font-size: 1\.44rem;/m);
    expect(css).toMatch(/\.workspace-brand \.workspace-brand-lockup\.compact \.wemail-brand-lockup-logo\s*\{\s*width: 38px;\s*height: 38px;/m);
    expect(css).toMatch(/\.workspace-brand \.workspace-brand-lockup \.wemail-wordmark\s*\{\s*font-size: 1\.44rem;/m);
    expect(css).toMatch(/\.landing-brand-lockup\.footer \.wemail-brand-lockup-logo\s*\{\s*width: 52px;\s*height: 52px;/m);
    expect(css).toMatch(/\.landing-brand-lockup\.footer \.wemail-wordmark\s*\{\s*font-size: 1\.86rem;/m);
  });

  it("centers the lockup detail under the wordmark and keeps the OG image brand block centered", () => {
    const wordmarkSvg = readFileSync(resolve(process.cwd(), "public", "brand", "wordmark.svg"), "utf8");
    const lockupSvg = readFileSync(resolve(process.cwd(), "public", "brand", "lockup.svg"), "utf8");
    const ogSvg = readFileSync(resolve(process.cwd(), "public", "brand", "og-image.svg"), "utf8");

    expect(wordmarkSvg).toContain('text-anchor="middle"><tspan fill="#111111">We</tspan><tspan fill="#ff7a00">Mail</tspan></text>');
    expect(wordmarkSvg).toContain('text x="130" y="56"');

    expect(lockupSvg).toContain('text-anchor="middle"><tspan fill="#111111">We</tspan><tspan fill="#ff7a00">Mail</tspan></text>');
    expect(lockupSvg).toContain('text-anchor="middle">EDGE MAIL OPERATIONS</text>');
    expect(lockupSvg).not.toContain('text-anchor="end">We</text>');
    expect(lockupSvg).not.toContain('text-anchor="start">Mail</text>');

    expect(ogSvg).toContain('text-anchor="middle"><tspan fill="#111111">We</tspan><tspan fill="#ff7a00">Mail</tspan></text>');
    expect(ogSvg).toContain('text-anchor="middle">EDGE MAIL OPERATIONS</text>');
    expect(ogSvg).not.toContain("Temporary inboxes, outbound control, and admin oversight");
  });

  it("ships the source WeMail PNG and an enlarged favicon crop", () => {
    const brandDir = resolve(process.cwd(), "public", "brand");
    const sourceLogo = readPngSize(resolve(brandDir, "WeMail.png"));
    const faviconLogo = readPngSize(resolve(brandDir, "WeMail-favicon.png"));

    expect(sourceLogo).toEqual({ width: 1254, height: 1254 });
    expect(faviconLogo).toEqual({ width: 512, height: 512 });
  });

  it("wires favicon, app icons, and social previews to the shared WeMail PNG", () => {
    const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const manifest = readFileSync(resolve(process.cwd(), "public", "brand", "site.webmanifest"), "utf8");

    expect(indexHtml).toContain('property="og:image" content="/brand/WeMail.png"');
    expect(indexHtml).toContain('name="twitter:image" content="/brand/WeMail.png"');
    expect(indexHtml).toContain('rel="icon" type="image/png" href="/brand/WeMail-favicon.png"');
    expect(indexHtml).toContain('rel="shortcut icon" href="/brand/WeMail-favicon.png"');
    expect(indexHtml).toContain('rel="apple-touch-icon" href="/brand/WeMail.png"');

    expect(manifest).toContain('/brand/WeMail.png');
    expect(manifest).toContain('"sizes": "1254x1254"');
  });
});
