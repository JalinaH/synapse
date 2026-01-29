"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const STORAGE_KEY = "synapse-theme";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (value: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const fromDom = document.documentElement.dataset.theme as Theme | undefined;
  if (fromDom === "light" || fromDom === "dark") return fromDom;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

// Use useSyncExternalStore to detect hydration without calling setState in effect
function useIsHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const isHydrated = useIsHydrated();
  const initialized = useRef(false);

  // Initialize theme on first hydrated render
  if (isHydrated && !initialized.current) {
    initialized.current = true;
    const preferred = getPreferredTheme();
    if (preferred !== theme) {
      setThemeState(preferred);
    }
  }

  // Sync theme to DOM - useLayoutEffect avoids flash
  useLayoutEffect(() => {
    if (!isHydrated || typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, isHydrated]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState((t) => (t === "light" ? "dark" : "light")),
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
