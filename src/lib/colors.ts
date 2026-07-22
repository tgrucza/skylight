/**
 * Per-member wayfinding colors. Twelve curated hues ship by default (design
 * doc §03); a member may also pick a fully custom hue on the HSL wheel, so
 * these are seed data, not an enum — `color_hex` on family_members is a free
 * hex string, not constrained to this list.
 */
export const MEMBER_COLORS = [
  { name: "Coral", hex: "#E8836B" },
  { name: "Tangerine", hex: "#E39A5A" },
  { name: "Amber", hex: "#E0B84C" },
  { name: "Sage", hex: "#86A06B" },
  { name: "Teal", hex: "#4FA69A" },
  { name: "Sky", hex: "#5B9BD1" },
  { name: "Indigo", hex: "#6E7FD4" },
  { name: "Violet", hex: "#9A7BD0" },
  { name: "Plum", hex: "#B06BA6" },
  { name: "Rose", hex: "#DA7196" },
  { name: "Slate", hex: "#7E8A99" },
  { name: "Mint", hex: "#6FBFA0" },
] as const;

export const DEFAULT_MEMBER_COLOR = MEMBER_COLORS[0].hex;

/** Appends an alpha suffix to a 6-digit hex color, e.g. withAlpha('#BF6544', 0.13) -> '#BF654421'. */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/** Picks readable text (white or ink) against a given member color background. */
export function readableTextOn(hex: string): "#FFFFFF" | "#2B2723" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance (sRGB, simplified) — matches WCAG-style thresholding.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#2B2723" : "#FFFFFF";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
