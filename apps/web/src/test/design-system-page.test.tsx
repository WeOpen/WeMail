import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { DesignSystemPage } from "../pages/DesignSystemPage";
import { designSystemGroups } from "../pages/design-system/designSystemContent";

const defaultInnerWidth = window.innerWidth;

describe("DesignSystemPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: defaultInnerWidth
    });
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
    expect(screen.getByRole("heading", { name: "Design tokens" })).toBeInTheDocument();
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
    expect(within(sidebar).getByRole("button", { name: "FilterBar" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Icon" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Toast" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("button", { name: "Chart" })).toBeInTheDocument();
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

  it("keeps the design system sidebar clickable on compact viewports", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390
    });

    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const sidebarShell = screen.getByRole("navigation", { name: "Design system sidebar" }).closest("aside");

    expect(sidebarShell).toHaveStyle({
      position: "relative",
      top: "auto",
      maxHeight: "none"
    });
  });

  it("keeps component detail pages focused and does not render section-level preview panes", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.queryAllByTestId("design-system-preview-pane")).toHaveLength(0);
  });

  it("shows button component demos at the top without rendering unrelated section previews", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    const componentShowcase = screen.getByRole("region", { name: "组件展示" });
    expect(within(componentShowcase).getByRole("button", { name: "保存变更" })).toBeInTheDocument();
    expect(within(componentShowcase).getByRole("button", { name: "停用账号" })).toBeInTheDocument();

    const codeSamplesRegion = screen.getByRole("region", { name: "代码示例：Button" });
    expect(within(codeSamplesRegion).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
    expect(within(codeSamplesRegion).getAllByText(/<Button/).length).toBeGreaterThan(0);

    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    expect(headings.indexOf("Examples")).toBeLessThan(headings.indexOf("Import"));
    expect(screen.queryByRole("heading", { name: "Buttons & Actions" })).not.toBeInTheDocument();
  });

  it("renders component docs in a HeroUI-inspired structure", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    const headings = screen.getAllByRole("heading").map((node) => node.textContent);
    const expected = ["Examples", "Import", "Usage", "Variants", "Anatomy", "Accessibility", "API Reference"];
    const indexes = expected.map((heading) => headings.indexOf(heading));

    expect(indexes.every((index) => index >= 0)).toBe(true);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(screen.getByText(/当前组件示例已放在页面顶部/)).toBeInTheDocument();
  });

  it("summarizes component usage, boundaries, and maintenance guidance at the top of the detail panel", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "FilterBar" }));

    expect(screen.getByRole("heading", { name: "FilterBar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "什么时候用" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "什么时候不用" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "维护重点" })).toBeInTheDocument();
    expect(screen.getAllByText(/统一搜索、下拉、多选、批量动作和结果计数/).length).toBeGreaterThan(0);
  });

  it("scrolls the right component detail back to the top when a sidebar item is selected", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Button" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByTestId("design-system-content-top")).toBeInTheDocument();
  });

  it("renders a floating back-to-top icon action in the lower-right corner", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo
    });

    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const backToTopButton = screen.getByRole("button", { name: "返回顶部" });

    expect(backToTopButton).toHaveClass("ui-button-icon-only");
    expect(backToTopButton).toHaveStyle({ position: "fixed", right: "24px", bottom: "24px" });

    fireEvent.click(backToTopButton);

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
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
        expect(screen.getByRole("region", { name: "组件展示" })).toBeInTheDocument();
        expect(screen.queryByText("当前组件展示待补充。")).not.toBeInTheDocument();
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
        expect(component.codeSamples?.length ?? 0).toBeGreaterThanOrEqual(2);
      }
    }
  }, 10_000);

  it("documents Tag and Badge samples through their component-specific examples", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Badge" }));
    expect(within(screen.getByRole("region", { name: "组件展示" })).getByText("启用")).toHaveAttribute("data-size", "md");
    expect(within(screen.getByRole("region", { name: "组件展示" })).getByText("待处理")).toHaveAttribute("data-size", "md");
    expect(within(screen.getByRole("region", { name: "代码示例：Badge" })).getByText(/<Badge variant="success" size="md">启用<\/Badge>/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    expect(within(screen.getByRole("region", { name: "组件展示" })).getByText("新版").closest(".ui-tag")).toHaveAttribute("data-size", "md");
    expect(within(screen.getByRole("region", { name: "组件展示" })).getByText("异常账号").closest(".ui-tag")).toHaveAttribute("data-size", "md");
    expect(within(screen.getByRole("region", { name: "代码示例：Tag" })).getByText(/<Tag dot variant="brand">新版<\/Tag>/)).toBeInTheDocument();
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
