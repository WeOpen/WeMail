import { type CSSProperties } from "react";

export const designSystemSharedStyles = {
  stack: {
    display: "grid",
    gap: "16px"
  } satisfies CSSProperties,
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px"
  } satisfies CSSProperties,
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: 1.2,
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-secondary, rgba(15, 23, 42, 0.04))",
    color: "var(--text, #111827)"
  } satisfies CSSProperties,
  previewCard: {
    minWidth: 0,
    overflowWrap: "anywhere",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    borderRadius: "16px",
    padding: "16px",
    background: "var(--surface-muted)",
    display: "grid",
    gap: "12px"
  } satisfies CSSProperties
};

export const designSystemPageStyles = {
  shell: {
    maxWidth: "1440px",
    width: "min(1440px, calc(100vw - 24px))",
    margin: "0 auto",
    padding: "84px 0 32px"
  } satisfies CSSProperties,
  hero: {
    display: "grid",
    gap: "20px",
    gridTemplateColumns: "minmax(0, 1fr)",
    alignItems: "start",
    background: "var(--surface-muted)",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)"
  } satisfies CSSProperties,
  sectionLayout: {
    display: "grid",
    gap: "20px",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    alignItems: "start"
  } satisfies CSSProperties,
  groupGallery: {
    display: "grid",
    gap: "26px"
  } satisfies CSSProperties,
  groupCard: {
    display: "grid",
    gap: "22px",
    alignItems: "start",
    padding: "26px",
    background: "var(--surface-muted)",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)"
  } satisfies CSSProperties,
  groupCardHeader: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: "16px",
    paddingBottom: "14px",
    borderBottom: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))"
  } satisfies CSSProperties,
  groupTitle: {
    margin: 0,
    fontSize: "clamp(1.35rem, 2vw, 2rem)",
    lineHeight: 1.08,
    letterSpacing: "0"
  } satisfies CSSProperties,
  componentGrid: {
    display: "grid",
    gap: "22px",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
    alignItems: "start"
  } satisfies CSSProperties,
  componentCard: {
    minWidth: 0,
    display: "grid",
    gap: "14px",
    alignContent: "start",
    paddingTop: "2px"
  } satisfies CSSProperties,
  componentCardHeader: {
    minHeight: "42px",
    display: "grid",
    gap: "3px",
    alignContent: "start"
  } satisfies CSSProperties,
  componentTitle: {
    margin: 0,
    color: "var(--text, #111827)",
    fontSize: "1rem",
    fontWeight: 760,
    lineHeight: 1.15,
    letterSpacing: "0"
  } satisfies CSSProperties,
  componentSubtitle: {
    color: "var(--text-muted, #667085)",
    fontSize: "12px",
    lineHeight: 1.3
  } satisfies CSSProperties,
  componentPreviewSurface: {
    minWidth: 0,
    overflowX: "auto",
    scrollbarGutter: "stable",
    padding: "18px",
    borderRadius: "20px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-secondary, rgba(15, 23, 42, 0.04))"
  } satisfies CSSProperties,
  metaGrid: {
    display: "grid",
    gap: "12px"
  } satisfies CSSProperties,
  sidebarShell: {
    display: "grid",
    gap: "20px",
    alignSelf: "start",
    position: "sticky",
    top: "96px",
    padding: "8px 0",
    borderRadius: "24px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-muted)",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)"
  } satisfies CSSProperties,
  sidebarNav: {
    minHeight: 0,
    padding: "10px 10px 22px 22px",
    border: "none",
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    backdropFilter: "none"
  } satisfies CSSProperties,
  sidebarGroup: {
    gap: "10px"
  } satisfies CSSProperties,
  sidebarGroupHeader: {
    margin: 0,
    padding: "0 2px"
  } satisfies CSSProperties,
  sidebarGroupList: {
    gap: "10px"
  } satisfies CSSProperties,
  sidebarButton: {
    cursor: "pointer"
  } satisfies CSSProperties,
  sidebarButtonActive: {
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.16)"
  } satisfies CSSProperties,
  sidebarButtonMeta: {
    fontSize: "12px"
  } satisfies CSSProperties,
  sidebarDot: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "currentColor",
    display: "inline-block"
  } satisfies CSSProperties,
  emphasisChip: {
    ...designSystemSharedStyles.chip,
    background: "var(--brand-50, rgba(255, 122, 0, 0.12))",
    borderColor: "var(--brand-200, rgba(255, 122, 0, 0.2))",
    color: "var(--brand-600, #b45309)"
  } satisfies CSSProperties,
  denseList: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "8px",
    color: "var(--text-muted, #667085)"
  } satisfies CSSProperties,
  subheading: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text, #111827)"
  } satisfies CSSProperties,
  backToTopButton: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    zIndex: 30,
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
    background: "var(--surface-primary, rgba(255, 255, 255, 0.96))"
  } satisfies CSSProperties
};

export const designSystemExampleStyles = {
  previewPane: {
    minWidth: 0,
    display: "grid",
    gap: "16px"
  } satisfies CSSProperties,
  previewGrid: {
    minWidth: 0,
    display: "grid",
    gap: "16px"
  } satisfies CSSProperties,
  twoColumnGrid: {
    minWidth: 0,
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))"
  } satisfies CSSProperties,
  comfortablePreviewGrid: {
    minWidth: 0,
    display: "grid",
    gap: "16px",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))"
  } satisfies CSSProperties,
  denseGrid: {
    minWidth: 0,
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 128px), 1fr))"
  } satisfies CSSProperties,
  fullWidthCard: {
    minWidth: 0,
    overflowX: "auto",
    scrollbarGutter: "stable"
  } satisfies CSSProperties
};

export const designSystemDocStyles = {
  shell: {
    display: "grid",
    gap: "20px",
    padding: "24px",
    borderRadius: "24px",
    background: "var(--surface-muted)",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)"
  } satisfies CSSProperties,
  header: {
    display: "grid",
    gap: "12px",
    paddingBottom: "16px",
    borderBottom: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))"
  } satisfies CSSProperties,
  introGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))"
  } satisfies CSSProperties,
  introCard: {
    display: "grid",
    gap: "6px",
    minWidth: 0,
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-secondary, rgba(15, 23, 42, 0.04))"
  } satisfies CSSProperties,
  introHeading: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text, #111827)"
  } satisfies CSSProperties,
  sectionList: {
    display: "grid",
    gap: "16px"
  } satisfies CSSProperties,
  section: {
    display: "grid",
    gap: "10px",
    padding: "18px 20px",
    borderRadius: "18px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-muted)",
    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.08)"
  } satisfies CSSProperties,
  sectionHeading: {
    margin: 0,
    fontSize: "18px"
  } satisfies CSSProperties,
  paragraphGroup: {
    display: "grid",
    gap: "8px"
  } satisfies CSSProperties,
  exampleNote: {
    padding: "14px 16px",
    borderRadius: "14px",
    background: "var(--surface-secondary, rgba(15, 23, 42, 0.04))",
    color: "var(--text-muted, #667085)"
  } satisfies CSSProperties,
  guidanceNote: {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-primary, rgba(255,255,255,0.9))"
  } satisfies CSSProperties,
  codeSampleList: {
    display: "grid",
    gap: "12px"
  } satisfies CSSProperties,
  codeSampleCard: {
    display: "grid",
    gap: "8px"
  } satisfies CSSProperties,
  codeSampleHeading: {
    margin: 0,
    fontSize: "15px",
    color: "var(--text, #111827)"
  } satisfies CSSProperties,
  codeSamplePre: {
    margin: 0,
    padding: "14px 16px",
    overflowX: "auto",
    borderRadius: "14px",
    border: "1px solid var(--border-subtle, rgba(15, 23, 42, 0.08))",
    background: "var(--surface-secondary, rgba(15, 23, 42, 0.04))",
    color: "var(--text, #111827)",
    fontSize: "13px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap"
  } satisfies CSSProperties
};

export function resolveDesignSystemSidebarLayoutStyle(viewportWidth?: number): CSSProperties {
  const width = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1280);

  if (width < 980) {
    return {
      display: "grid",
      gap: "24px",
      gridTemplateColumns: "minmax(0, 1fr)",
      alignItems: "start"
    };
  }

  return {
    display: "grid",
    gap: "28px",
    gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr)",
    alignItems: "start"
  };
}

export function resolveDesignSystemSidebarShellStyle(viewportWidth?: number): CSSProperties {
  const width = viewportWidth ?? (typeof window !== "undefined" ? window.innerWidth : 1280);

  if (width < 980) {
    return {
      alignSelf: "start",
      maxHeight: "none",
      position: "relative",
      top: "auto",
      zIndex: 1
    };
  }

  return {};
}
