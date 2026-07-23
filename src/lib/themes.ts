/** App chrome themes — CSS variable sets applied via `data-theme` on `<html>`. */

export const APP_THEMES = [
  { id: "calm", label: "Orbit", group: "everyday", swatches: ["#f5f1ea", "#bf6544", "#7b8b6a"] },
  { id: "ocean", label: "Ocean", group: "everyday", swatches: ["#eef5f4", "#2a7a7b", "#5a8a9a"] },
  { id: "midnight", label: "Midnight", group: "everyday", swatches: ["#141a22", "#d4a574", "#5e7c99"] },
  { id: "sunshine", label: "Sunshine", group: "everyday", swatches: ["#fff8e7", "#e8a317", "#f0c85a"] },
  { id: "berry", label: "Berry", group: "everyday", swatches: ["#f7eef2", "#a8486e", "#6b3a52"] },
  { id: "pastel", label: "Soft Pastel", group: "everyday", swatches: ["#f7f4fb", "#9bb8d4", "#e8b4c8"] },
  { id: "forest", label: "Forest", group: "everyday", swatches: ["#eef2ea", "#3d6b4f", "#8a9a6e"] },
  { id: "spring", label: "Spring", group: "seasonal", swatches: ["#fff5f8", "#48c484", "#ff7ab8"] },
  { id: "summer", label: "Summer", group: "seasonal", swatches: ["#fff4c8", "#ffb000", "#0898e0"] },
  { id: "fall", label: "Fall", group: "seasonal", swatches: ["#fce6c8", "#f04000", "#c06810"] },
  { id: "halloween", label: "Halloween", group: "seasonal", swatches: ["#100c16", "#ff6a00", "#b04fff"] },
  { id: "christmas", label: "Christmas", group: "seasonal", swatches: ["#fff5f0", "#e01818", "#0e8a3c"] },
  { id: "softball", label: "Softball", group: "fun", swatches: ["#e8f8d8", "#2e8a18", "#c48840"] },
] as const;

export type AppThemeId = (typeof APP_THEMES)[number]["id"];

export const DEFAULT_APP_THEME: AppThemeId = "calm";

const THEME_IDS = new Set<string>(APP_THEMES.map((t) => t.id));

/** Older persisted ids → current ids (one-time migration in ThemeProvider). */
const THEME_ALIASES: Record<string, AppThemeId> = {
  sunset: "sunshine",
  orbit: "calm",
  "soft-pastel": "pastel",
};

export function isAppThemeId(value: string): value is AppThemeId {
  return THEME_IDS.has(value);
}

export function resolveAppThemeId(value: string | null | undefined): AppThemeId {
  if (!value) return DEFAULT_APP_THEME;
  if (isAppThemeId(value)) return value;
  return THEME_ALIASES[value] ?? DEFAULT_APP_THEME;
}

/** Themes that get CSS-only hub decorations (corners/edges, pointer-events-none). */
export const DECORATED_THEMES = new Set<AppThemeId>([
  "spring",
  "summer",
  "fall",
  "halloween",
  "christmas",
  "softball",
]);
