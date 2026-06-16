import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { DesignSystemPage } from "../pages/DesignSystemPage";
import { designSystemGroups } from "../pages/design-system/designSystemContent";

describe("DesignSystemPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a sidebar-driven public design system docsite", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebar = screen.getByRole("navigation", { name: "Design system sidebar" });

    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getAllByRole("button").length).toBeGreaterThan(20);
    expect(screen.getByRole("navigation", { name: "首页导航" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "Foundations" }).length).toBeGreaterThan(0);
    expect(screen.getByText(/参考 HeroUI/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WeMail 首页" })).toBeInTheDocument();
  });

  it("renders sidebar groups with component items only and no overview entries", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebar = screen.getByRole("navigation", { name: "Design system sidebar" });

    expect(within(sidebar).queryByRole("button", { name: /概览/i })).not.toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Button" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Card" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Table" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Alert" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Tabs" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "SearchInput" })).toBeInTheDocument();
  });

  it("keeps the left sidebar as a single visual shell", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebar = screen.getByRole("navigation", { name: "Design system sidebar" });
    const sidebarParentSection = sidebar.closest("section");
    const sidebarAside = sidebar.closest("aside");

    expect(sidebarParentSection).toBeNull();
    expect(sidebarAside).toHaveClass("workspace-rail-shell");
    expect(sidebarAside).not.toHaveClass("panel");
    expect(sidebar).toHaveClass("workspace-rail", "workspace-scroll-area");
    expect(sidebar).toHaveStyle({
      border: "none",
      borderRadius: "0",
      background: "transparent",
      boxShadow: "none"
    });
  });

  it("keeps a single elevated sidebar base card and leaves non-active sidebar items unshadowed", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebarShell = screen.getByRole("navigation", { name: "Design system sidebar" }).closest("aside");
    const activeSidebarItem = screen.getByRole("button", { name: "Design tokens" });
    const inactiveSidebarItem = screen.getByRole("button", { name: "PageLayout" });
    const docCard = screen.getByRole("heading", { name: "Design tokens" }).closest("section");

    expect(sidebarShell).not.toBeNull();
    expect(activeSidebarItem.closest("aside")).toBe(sidebarShell);
    expect(inactiveSidebarItem).not.toHaveStyle({ boxShadow: "0 16px 32px rgba(0, 0, 0, 0.18)" });
    expect(docCard).not.toBeNull();
  });

  it("removes the empty top gutter inside the sidebar base card", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebar = screen.getByRole("navigation", { name: "Design system sidebar" });
    const firstGroupHeading = within(sidebar).getByText("Foundations");

    expect(firstGroupHeading).toBeInTheDocument();
  });

  it("renders a public showcase with live overlay controls", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.getByText("WeMail Design System v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开对话框" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开抽屉" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开对话框" }));
    expect(screen.getByRole("dialog", { name: "Dialog live preview" })).toBeInTheDocument();
  });

  it("keeps the drawer preview action compact", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "打开抽屉" }));

    const drawer = screen.getByRole("dialog", { name: "Drawer live preview" });
    expect(within(drawer).getByRole("button", { name: "完成预览" })).toHaveClass("ui-button-size-xs");
  });

  it("uses the same card surface tone for hero and right-side docs, and keeps sidebar cards elevated", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const heroCard = screen.getByText("WeMail Design System v1").closest("section");
    const docCard = screen.getByRole("heading", { name: "Design tokens" }).closest("section");
    const activeSidebarItem = screen.getByRole("button", { name: "Design tokens" });

    expect(heroCard).not.toBeNull();
    expect(docCard).not.toBeNull();
    expect(activeSidebarItem).not.toBeNull();
  });

  it("keeps live preview panes shrinkable inside the design system layout", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const previewPanes = screen.getAllByTestId("design-system-preview-pane");

    expect(previewPanes.length).toBeGreaterThan(0);
    for (const previewPane of previewPanes) {
      expect(previewPane).toHaveStyle({ minWidth: "0" });
    }
  });

  it("shows button code samples alongside the live button preview", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    const codeSamplesRegion = screen.getByRole("region", { name: "代码示例：Button" });
    expect(within(codeSamplesRegion).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
    expect(within(codeSamplesRegion).getAllByText(/<Button/).length).toBeGreaterThan(0);

    const livePreviewSection = screen.getByRole("heading", { name: "Buttons & Actions" }).closest("section");
    expect(livePreviewSection).not.toBeNull();
    expect(within(livePreviewSection as HTMLElement).getByRole("button", { name: "保存变更" })).toBeInTheDocument();
    expect(within(livePreviewSection as HTMLElement).getByRole("button", { name: "停用账号" })).toBeInTheDocument();
  });

  it("renders component docs in a HeroUI-inspired structure", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    const expected = ["Import", "Usage", "Variants", "Anatomy", "Accessibility", "API Reference", "Examples"];
    const indexes = expected.map((heading) => headings.indexOf(heading));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(screen.getByText(/HeroUI 的组件文档通常先给出 import/)).toBeInTheDocument();
  });

  it("renders a structured API table for a component", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    expect(screen.getByText("prop")).toBeInTheDocument();
    expect(screen.getByText("type")).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
  });

  it("renders every sidebar-listed component with complete examples, api, and usage docs", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    for (const group of designSystemGroups) {
      for (const component of group.components) {
        fireEvent.click(screen.getByRole("button", { name: component.title }));

        expect(screen.getByRole("heading", { name: component.title })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "文档章节：Import" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "文档章节：Usage" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "文档章节：Variants" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "文档章节：Anatomy" })).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "文档章节：Accessibility" })).toBeInTheDocument();

        const apiSection = screen.getByRole("region", { name: "文档章节：API Reference" });
        expect(within(apiSection).getByRole("columnheader", { name: "prop" })).toBeInTheDocument();
        expect(within(apiSection).getByRole("columnheader", { name: "type" })).toBeInTheDocument();
        expect(within(apiSection).getByRole("columnheader", { name: "default" })).toBeInTheDocument();
        expect(within(apiSection).getByRole("columnheader", { name: "description" })).toBeInTheDocument();

        expect(component.api?.length ?? 0).toBeGreaterThan(0);
        expect(component.docSections?.length ?? 0).toBeGreaterThan(0);
      }
    }
  }, 10_000);

  it("keeps Tag and Badge samples on the same display size", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    for (const label of ["新版", "合规", "启用", "阻塞"]) {
      expect(screen.getByText(label).closest("[data-size]")).toHaveAttribute("data-size", "md");
    }
  });

  it("defaults to the first component detail instead of a group overview", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Design tokens" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /概览/i })).not.toBeInTheDocument();
  });
});
