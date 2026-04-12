import { useCallback, useEffect, useState } from "react";

export type WorkspaceTheme = "dark" | "light";

export const WORKSPACE_THEME_STORAGE_KEY = "wemail-workspace-theme";

function resolveInitialTheme(): WorkspaceTheme {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "dark";
}

function applyTheme(theme: WorkspaceTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useWorkspaceTheme() {
  const [theme, setTheme] = useState<WorkspaceTheme>(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    toggleTheme
  };
}
