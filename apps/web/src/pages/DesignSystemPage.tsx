import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { type WorkspaceTheme } from "../app/appStore";
import { PublicSiteNavigation } from "../features/landing/PublicSiteNavigation";
import { Badge } from "../shared/badge";
import { Button } from "../shared/button";
import { Icon } from "../shared/icon";
import { DesignSystemComponentShowcase } from "./design-system/DesignSystemComponentShowcase";
import { designSystemGroups } from "./design-system/designSystemContent";
import {
  designSystemPageStyles,
  designSystemSharedStyles
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
const totalComponentCount = groups.reduce((total, group) => total + group.components.length, 0);

type DesignSystemPageProps = {
  consoleHref?: string;
  isAuthenticated?: boolean;
};

export function DesignSystemPage({ consoleHref, isAuthenticated = false }: DesignSystemPageProps = {}) {
  const [previewTheme, setPreviewTheme] = useState<WorkspaceTheme>(resolveInitialPreviewTheme);

  function togglePreviewTheme() {
    setPreviewTheme((current) => (current === "dark" ? "light" : "dark"));
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

  return (
    <div className="design-system-public-page" data-testid="design-system-page">
      <PublicSiteNavigation
        consoleHref={consoleHref}
        isAuthenticated={isAuthenticated}
        onToggleTheme={togglePreviewTheme}
        theme={previewTheme}
      />
      <main className="design-system-grid" style={{ ...designSystemPageStyles.shell, display: "grid", gap: "20px" }}>
        <section className="panel workspace-card page-panel design-system-panel" style={designSystemPageStyles.hero}>
          <div style={{ ...designSystemSharedStyles.stack, gap: "12px" }}>
            <p className="panel-kicker" style={{ margin: 0, alignSelf: "start" }}>
              WeMail Design System v1
            </p>
            <div style={{ ...designSystemSharedStyles.stack, gap: "10px" }}>
              <h1 style={{ margin: 0 }}>Components</h1>
            </div>
            <div style={{ ...designSystemSharedStyles.chipRow, justifyContent: "space-between", alignItems: "center" }}>
              <div style={designSystemSharedStyles.chipRow}>
                <span style={designSystemPageStyles.emphasisChip}>{`${groups.length} groups`}</span>
                <span style={designSystemSharedStyles.chip}>{`${totalComponentCount} components`}</span>
                <span style={designSystemSharedStyles.chip}>/design-system</span>
              </div>
              <div style={designSystemSharedStyles.chipRow}>
                <Badge variant={previewTheme === "dark" ? "info" : "warning"}>{previewTheme === "dark" ? "深色模式" : "浅色模式"}</Badge>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Component groups" style={designSystemPageStyles.groupGallery}>
          {groups.map((group) => (
            <section
              aria-label={`${group.title} 组件组`}
              className="panel workspace-card page-panel design-system-panel"
              data-testid="design-system-group-card"
              key={group.id}
              style={designSystemPageStyles.groupCard}
            >
              <header style={designSystemPageStyles.groupCardHeader}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <p className="panel-kicker" style={{ margin: 0 }}>{group.chineseTitle}</p>
                  <h2 style={designSystemPageStyles.groupTitle}>{group.title}</h2>
                </div>
                <Badge variant="neutral">{`${group.components.length} components`}</Badge>
              </header>
              <div data-testid="design-system-component-grid" style={designSystemPageStyles.componentGrid}>
                {group.components.map((component) => (
                  <article
                    aria-label={`${component.title} 组件展示`}
                    data-testid="design-system-component-card"
                    key={component.id}
                    style={designSystemPageStyles.componentCard}
                  >
                    <header style={designSystemPageStyles.componentCardHeader}>
                      <h3 style={designSystemPageStyles.componentTitle}>{component.title}</h3>
                      <span style={designSystemPageStyles.componentSubtitle}>{component.chineseTitle}</span>
                    </header>
                    <div data-testid="design-system-component-preview" style={designSystemPageStyles.componentPreviewSurface}>
                      <DesignSystemComponentShowcase componentId={component.id} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
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
