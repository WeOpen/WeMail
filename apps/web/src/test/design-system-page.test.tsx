import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { DesignSystemPage } from "../pages/DesignSystemPage";
import { designSystemGroups } from "../pages/design-system/designSystemContent";

const totalComponentCount = designSystemGroups.reduce((total, group) => total + group.components.length, 0);

describe("DesignSystemPage", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a grouped component gallery without the old left sidebar", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId("design-system-page")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Design system sidebar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Import" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Usage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "API Reference" })).not.toBeInTheDocument();

    const groupCards = screen.getAllByTestId("design-system-group-card");
    expect(groupCards).toHaveLength(designSystemGroups.length);

    for (const group of designSystemGroups) {
      const groupRegion = screen.getByRole("region", { name: `${group.title} 组件组` });
      expect(within(groupRegion).getByRole("heading", { name: group.title })).toBeInTheDocument();
      expect(within(groupRegion).getAllByTestId("design-system-component-card")).toHaveLength(group.components.length);
    }
  });

  it("shows every design system component as a card", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.getAllByTestId("design-system-component-card")).toHaveLength(totalComponentCount);

    for (const group of designSystemGroups) {
      for (const component of group.components) {
        expect(screen.getByRole("article", { name: `${component.title} 组件展示` })).toBeInTheDocument();
      }
    }
  });

  it("keeps cards focused on component previews instead of prose documentation", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    expect(screen.queryByText(/当前组件示例已放在页面顶部/)).not.toBeInTheDocument();
    expect(screen.queryByText(/适用场景/)).not.toBeInTheDocument();
    expect(screen.queryByText(/不适用场景/)).not.toBeInTheDocument();
    expect(screen.queryByText(/代码示例/)).not.toBeInTheDocument();
    expect(screen.queryByText(/参考 HeroUI/)).not.toBeInTheDocument();
  });

  it("gives dense component previews more breathing room", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const dataDisplayCard = screen.getByRole("article", { name: "Data display 组件展示" });
    const dataDisplayPreview = within(dataDisplayCard).getByRole("region", { name: "组件展示" });
    const metricCard = screen.getByRole("article", { name: "MetricCard 组件展示" });
    const metricPreview = within(metricCard).getByRole("region", { name: "组件展示" });

    expect(screen.getByRole("region", { name: "Content & Actions 组件组" }).querySelector("[data-testid='design-system-component-grid']")).toHaveStyle({
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))"
    });
    expect(dataDisplayPreview.firstElementChild).toHaveAttribute("data-layout", "comfortable-preview-grid");
    expect(metricPreview.firstElementChild).toHaveAttribute("data-layout", "comfortable-preview-grid");
    expect(dataDisplayCard.querySelector("[data-testid='design-system-component-preview']")).toHaveStyle({
      padding: "18px"
    });
  });

  it("shows variants for representative components in their own cards", () => {
    render(
      <MemoryRouter>
        <DesignSystemPage />
      </MemoryRouter>
    );

    const buttonCard = screen.getByRole("article", { name: "Button 组件展示" });
    expect(within(buttonCard).getByRole("button", { name: "保存变更" })).toBeInTheDocument();
    expect(within(buttonCard).getByRole("button", { name: "查看历史" })).toBeInTheDocument();
    expect(within(buttonCard).getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(within(buttonCard).getByRole("button", { name: "停用账号" })).toBeInTheDocument();
    expect(within(buttonCard).getByRole("button", { name: "搜索" })).toBeInTheDocument();

    const badgeCard = screen.getByRole("article", { name: "Badge 组件展示" });
    expect(within(badgeCard).getByText("启用")).toBeInTheDocument();
    expect(within(badgeCard).getByText("待处理")).toBeInTheDocument();
    expect(within(badgeCard).getByText("阻塞")).toBeInTheDocument();

    const tagCard = screen.getByRole("article", { name: "Tag 组件展示" });
    expect(within(tagCard).getByText("新版")).toBeInTheDocument();
    expect(within(tagCard).getByText("合规")).toBeInTheDocument();
    expect(within(tagCard).getByText("异常账号")).toBeInTheDocument();
  });

  it("uses the shared workspace theme control from its parent", () => {
    const onToggleTheme = vi.fn();

    render(
      <MemoryRouter>
        <DesignSystemPage onToggleTheme={onToggleTheme} theme="dark" />
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "首页导航" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WeMail 首页" })).toBeInTheDocument();
    expect(screen.getByText("WeMail Design System v1")).toBeInTheDocument();
    expect(screen.getByText("深色模式")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "切换到浅色主题" }));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
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

    expect(backToTopButton).toHaveClass("ui-button-icon-only", "floating-back-to-top");
    fireEvent.click(backToTopButton);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
