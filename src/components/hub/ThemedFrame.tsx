"use client";

import type { ReactNode } from "react";
import { useUIStore } from "@/stores/uiStore";
import { isAppThemeId } from "@/lib/themes";
import { cn } from "@/lib/cn";

const FRAME_THEMES = new Set(["christmas", "halloween", "fall"]);

/**
 * Wraps hub / shell panels with seasonal chrome (garland, leaf trim, etc.).
 * Everyday themes render a plain wrapper — no visual change.
 */
export function ThemedFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const appTheme = useUIStore((s) => s.appTheme);
  const seasonal = isAppThemeId(appTheme) && FRAME_THEMES.has(appTheme);

  return (
    <div
      className={cn(
        "themed-frame relative",
        seasonal && `themed-frame--${appTheme}`,
        className
      )}
    >
      {seasonal && (
        <div className="themed-frame__trim pointer-events-none" aria-hidden>
          {appTheme === "christmas" && (
            <>
              <span className="themed-frame__garland" />
              <span className="themed-frame__bow themed-frame__bow--l" />
              <span className="themed-frame__bow themed-frame__bow--r" />
            </>
          )}
          {appTheme === "halloween" && <span className="themed-frame__spook-trim" />}
          {appTheme === "fall" && <span className="themed-frame__leaf-trim" />}
        </div>
      )}
      {children}
    </div>
  );
}
