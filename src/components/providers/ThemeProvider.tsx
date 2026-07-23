"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { resolveAppThemeId } from "@/lib/themes";

/** Syncs the persisted device theme onto `<html data-theme="…">` so CSS variables apply app-wide. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appTheme = useUIStore((s) => s.appTheme);
  const setAppTheme = useUIStore((s) => s.setAppTheme);

  useEffect(() => {
    const resolved = resolveAppThemeId(appTheme);
    if (resolved !== appTheme) setAppTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, [appTheme, setAppTheme]);

  return <>{children}</>;
}
