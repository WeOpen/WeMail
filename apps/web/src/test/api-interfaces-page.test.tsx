import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ApiInterfacesPage } from "../features/settings/ApiInterfacesPage";

const sharedStyles = readFileSync("src/shared/styles/index.css", "utf8");

function getStyleRule(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = sharedStyles.matchAll(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`, "g"));

  return Array.from(matches, (match) => match[1]).join("\n");
}

describe("ApiInterfacesPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("expands an endpoint row to show parameter and request examples", () => {
    render(<ApiInterfacesPage />);

    const createKeyTrigger = screen.getByRole("button", { name: "展开 POST /api/api-keys 参数示例" });
    expect(createKeyTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "POST /api/api-keys 参数示例" })).not.toBeInTheDocument();

    fireEvent.click(createKeyTrigger);

    const details = screen.getByRole("region", { name: "POST /api/api-keys 参数示例" });
    expect(createKeyTrigger).toHaveAttribute("aria-expanded", "true");
    expect(within(details).getByRole("heading", { name: "参数示例" })).toBeInTheDocument();
    expect(within(details).getByText("Authorization: Bearer <api-key>")).toBeInTheDocument();
    expect(within(details).getByText("请求体示例")).toBeInTheDocument();
    expect(within(details).getByText(/"label": "个人 CLI"/)).toBeInTheDocument();

    fireEvent.click(createKeyTrigger);

    expect(screen.queryByRole("region", { name: "POST /api/api-keys 参数示例" })).not.toBeInTheDocument();
  });

  it("keeps the interface catalog grid inside the workspace viewport", () => {
    expect(getStyleRule(".api-interfaces-page")).toContain("overflow-x: hidden");
    expect(getStyleRule(".api-interfaces-layout")).toContain("grid-template-columns: minmax(0, 1fr) minmax(220px, 280px)");
    expect(getStyleRule(".api-interfaces-group-list")).toContain("min-width: 0");
    expect(getStyleRule(".api-interfaces-endpoint-trigger")).toContain("grid-template-columns: 64px minmax(0, 1fr) auto");
    expect(getStyleRule(".api-interfaces-side-rail")).toContain("min-width: 0");
    expect(getStyleRule(".api-interfaces-side-rail")).toContain("overflow: hidden");
    expect(getStyleRule(".api-interfaces-side-card")).toContain("max-width: 100%");
    expect(getStyleRule(".api-interfaces-method-list")).toContain("min-width: 0");
    expect(getStyleRule(".api-interfaces-method-row")).toContain("grid-template-columns: minmax(0, 1fr) auto");
  });
});
