import { type CSSProperties, useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

import { type WorkspaceTheme } from "../app/appStore";
import { PublicSiteNavigation } from "../features/landing/PublicSiteNavigation";
import { Badge } from "../shared/badge";
import { Button } from "../shared/button";
import { Icon } from "../shared/icon";
import { DesignSystemDocContent } from "./design-system/DesignSystemDocContent";
import { DesignSystemPreviewOverlays } from "./design-system/DesignSystemPreviewContent";
import { designSystemGroups } from "./design-system/designSystemContent";
import { PreviewActionButtons } from "./design-system/designSystemPreviewParts";
import { designSystemSections, findDesignSystemSection } from "./design-system/designSystemSections";
import {
  designSystemPageStyles,
  designSystemSharedStyles,
  resolveDesignSystemSidebarLayoutStyle,
  resolveDesignSystemSidebarShellStyle
} from "./design-system/designSystemStyles";

const DESIGN_SYSTEM_THEME_STORAGE_KEY = "wemail-design-system-preview-theme";

function resolveInitialPreviewTheme(): WorkspaceTheme {
  if (typeof window !== "undefined") {
    const storedTheme = window.localStorage.getItem(DESIGN_SYSTEM_THEME_STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

    if (typeof window.matchMedia === "function") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  }

  if (typeof document !== "undefined") {
    const datasetTheme = document.documentElement.dataset.theme;
    if (datasetTheme === "light" || datasetTheme === "dark") return datasetTheme;
  }

  return "light";
}

const groups = designSystemGroups;

export function DesignSystemPage() {
  const [previewTheme, setPreviewTheme] = useState<WorkspaceTheme>(resolveInitialPreviewTheme);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const initialGroup = groups[0];
  const initialComponent = initialGroup?.components[0] ?? null;
  const [activeGroupId, setActiveGroupId] = useState(initialGroup?.id ?? "foundations");
  const [activeComponentId, setActiveComponentId] = useState<string | null>(initialComponent?.id ?? null);
  const [sidebarLayoutStyle, setSidebarLayoutStyle] = useState<CSSProperties>(resolveDesignSystemSidebarLayoutStyle);
  const [sidebarShellStyle, setSidebarShellStyle] = useState<CSSProperties>(resolveDesignSystemSidebarShellStyle);
  const contentTopRef = useRef<HTMLDivElement>(null);

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const activeComponent = activeGroup?.components.find((component) => component.id === activeComponentId) ?? activeGroup?.components[0] ?? null;

  function togglePreviewTheme() {
    setPreviewTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function handleSelectComponent(groupId: string, componentId: string) {
    setActiveGroupId(groupId);
    setActiveComponentId(componentId);
    contentTopRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function handleBackToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const previousTheme = document.documentElement.dataset.theme;
    const previousColorScheme = document.documentElement.style.colorScheme;

    document.documentElement.dataset.theme = previewTheme;
    document.documentElement.style.colorScheme = previewTheme;
    window.localStorage.setItem(DESIGN_SYSTEM_THEME_STORAGE_KEY, previewTheme);

    return () => {
      if (previousTheme === "light" || previousTheme === "dark") {
        document.documentElement.dataset.theme = previousTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }

      document.documentElement.style.colorScheme = previousColorScheme;
    };
  }, [previewTheme]);

  useEffect(() => {
    function handleResize() {
      setSidebarLayoutStyle(resolveDesignSystemSidebarLayoutStyle());
      setSidebarShellStyle(resolveDesignSystemSidebarShellStyle());
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="design-system-public-page" data-testid="design-system-page">
      <PublicSiteNavigation onToggleTheme={togglePreviewTheme} theme={previewTheme} />
      <main className="design-system-grid" style={{ ...designSystemPageStyles.shell, display: "grid", gap: "20px" }}>
        <section className="panel workspace-card page-panel design-system-panel" style={designSystemPageStyles.hero}>
          <div style={{ ...designSystemSharedStyles.stack, gap: "12px" }}>
            <p className="panel-kicker" style={{ margin: 0, alignSelf: "start" }}>
              WeMail Design System v1
            </p>
            <div style={{ ...designSystemSharedStyles.stack, gap: "10px" }}>
              <h1 style={{ margin: 0 }}>Components</h1>
              <p className="section-copy" style={{ margin: 0, maxWidth: "820px" }}>
                参考 HeroUI React Components 的组件索引导航，但右侧详情聚焦当前组件：先给 Examples，再展开 Import、Usage、Variants、Anatomy、Accessibility 和 API Reference。
                WeMail 保留自己的共享原语、token 和业务约束，避免在单个组件页混入其它组件或分区级展示。
              </p>
            </div>
            <div style={{ ...designSystemSharedStyles.chipRow, justifyContent: "space-between", alignItems: "center" }}>
              <div style={designSystemSharedStyles.chipRow}>
                <span style={designSystemPageStyles.emphasisChip}>{`${groups.length} groups`}</span>
                <span style={designSystemSharedStyles.chip}>{`${groups.reduce((total, group) => total + group.components.length, 0)} components`}</span>
                <span style={designSystemSharedStyles.chip}>{`${designSystemSections.length} sections`}</span>
                <span style={designSystemSharedStyles.chip}>/design-system</span>
              </div>
              <div style={designSystemSharedStyles.chipRow}>
                <Badge variant={previewTheme === "dark" ? "info" : "warning"}>{previewTheme === "dark" ? "深色模式" : "浅色模式"}</Badge>
                <PreviewActionButtons onOpenDialog={() => setIsDialogOpen(true)} onOpenDrawer={() => setIsDrawerOpen(true)} />
              </div>
            </div>
          </div>
        </section>

        <div style={sidebarLayoutStyle}>
          <aside className="workspace-rail-shell" aria-label="design system sidebar shell" style={{ ...designSystemPageStyles.sidebarShell, ...sidebarShellStyle }}>
            <nav className="workspace-rail workspace-scroll-area" aria-label="Design system sidebar" style={designSystemPageStyles.sidebarNav}>
              {groups.map((group) => (
                <section className="workspace-rail-section" key={group.id} style={designSystemPageStyles.sidebarGroup}>
                  <p className="panel-kicker" style={designSystemPageStyles.sidebarGroupHeader}>{group.title}</p>
                  <div className="workspace-rail-list" style={designSystemPageStyles.sidebarGroupList}>
                    {group.components.map((component) => {
                      const isActiveComponent = group.id === activeGroupId && component.id === activeComponentId;

                      return (
                        <button
                          key={component.id}
                          aria-current={isActiveComponent ? "page" : undefined}
                          aria-label={component.title}
                          className="workspace-rail-link"
                          onClick={() => handleSelectComponent(group.id, component.id)}
                          style={{
                            ...designSystemPageStyles.sidebarButton,
                            ...(isActiveComponent ? designSystemPageStyles.sidebarButtonActive : null)
                          }}
                          type="button"
                        >
                          <span className="workspace-rail-icon-chip" aria-hidden="true">
                            <span style={designSystemPageStyles.sidebarDot} />
                          </span>
                          <div className="workspace-rail-copy">
                            <span>{component.title}</span>
                            <small>{component.chineseTitle}</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </nav>
          </aside>

          <div data-testid="design-system-content-top" ref={contentTopRef} style={{ display: "grid", gap: "24px", scrollMarginTop: "96px" }}>
            {activeComponent ? (
              <>
                <DesignSystemDocContent
                  componentDoc={activeComponent}
                  groupTitle={activeGroup?.title ?? "Design system"}
                  sectionTitles={activeComponent.sectionIds.map((sectionId) => findDesignSystemSection(sectionId).title)}
                />
              </>
            ) : null}
          </div>
        </div>

        <DesignSystemPreviewOverlays
          isDialogOpen={isDialogOpen}
          isDrawerOpen={isDrawerOpen}
          onCloseDialog={() => setIsDialogOpen(false)}
          onCloseDrawer={() => setIsDrawerOpen(false)}
        />
        <Button
          aria-label="返回顶部"
          iconOnly
          onClick={handleBackToTop}
          size="lg"
          style={designSystemPageStyles.backToTopButton}
          variant="icon"
        >
          <Icon decorative icon={ArrowUp} size="md" />
        </Button>
      </main>
    </div>
  );
}
