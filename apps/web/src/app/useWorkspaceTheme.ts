import { useCallback, useEffect, useState } from "react";

export type WorkspaceTheme = "dark" | "light";
export type WorkspaceThemePreference = WorkspaceTheme | "system";

export const WORKSPACE_THEME_STORAGE_KEY = "wemail-workspace-theme";

function resolveSystemTheme(): WorkspaceTheme {
  if (typeof window === "undefined") return "dark";

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "dark";
}

function resolveInitialThemePreference(): WorkspaceThemePreference {
  if (typeof window === "undefined") return "system";

  const storedTheme = window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light" || storedTheme === "system") return storedTheme;

  return "system";
}

function applyTheme(theme: WorkspaceTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function useWorkspaceTheme() {
  const [themePreference, setThemePreference] = useState<WorkspaceThemePreference>(resolveInitialThemePreference);
  const [systemTheme, setSystemTheme] = useState<WorkspaceTheme>(resolveSystemTheme);
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
  }, []);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, themePreference);
  }, [theme, themePreference]);

  const toggleTheme = useCallback(() => {
    setThemePreference((currentPreference) => {
      const currentResolved = currentPreference === "system" ? systemTheme : currentPreference;
      return currentResolved === "dark" ? "light" : "dark";
    });
  }, [systemTheme]);

  return {
    theme,
    themePreference,
    setThemePreference,
    toggleTheme
  };
}
