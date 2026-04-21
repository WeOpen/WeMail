import { useCallback, useEffect } from "react";

import { WORKSPACE_THEME_STORAGE_KEY, useAppStore, type WorkspaceTheme } from "./appStore";
export type { WorkspaceTheme, WorkspaceThemePreference } from "./appStore";

function applyTheme(theme: WorkspaceTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useWorkspaceTheme() {
  const themePreference = useAppStore((state) => state.themePreference);
  const systemTheme = useAppStore((state) => state.systemTheme);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const setSystemTheme = useAppStore((state) => state.setSystemTheme);
  const theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [setSystemTheme]);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, themePreference);
  }, [theme, themePreference]);

  const toggleTheme = useCallback(() => {
    const currentResolved = themePreference === "system" ? systemTheme : themePreference;
    setThemePreference(currentResolved === "dark" ? "light" : "dark");
  }, [setThemePreference, systemTheme, themePreference]);

  return {
    theme,
    themePreference,
    setThemePreference,
    toggleTheme
  };
}
