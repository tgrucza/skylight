"use client";

import {
  Star,
  Snowflake,
  Gift,
  TreePine,
  Sparkles,
  Candy,
  Ghost,
  Moon,
  Leaf,
} from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { DECORATED_THEMES, isAppThemeId } from "@/lib/themes";

/**
 * Seasonal accents for the hub / shell. Corner/edge ornaments only —
 * never intercepts clicks (`pointer-events-none`).
 */
export function ThemeDecor() {
  const appTheme = useUIStore((s) => s.appTheme);
  if (!isAppThemeId(appTheme) || !DECORATED_THEMES.has(appTheme)) return null;

  return (
    <div className="theme-decor pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {appTheme === "spring" && (
        <>
          <span className="theme-decor__petal theme-decor__petal--1" />
          <span className="theme-decor__petal theme-decor__petal--2" />
          <span className="theme-decor__petal theme-decor__petal--3" />
          <span className="theme-decor__petal theme-decor__petal--4" />
          <span className="theme-decor__petal theme-decor__petal--5" />
          <span className="theme-decor__bloom theme-decor__bloom--1" />
          <span className="theme-decor__bloom theme-decor__bloom--2" />
          <span className="theme-decor__bloom theme-decor__bloom--3" />
        </>
      )}
      {appTheme === "summer" && (
        <>
          <span className="theme-decor__ray theme-decor__ray--1" />
          <span className="theme-decor__ray theme-decor__ray--2" />
          <span className="theme-decor__ray theme-decor__ray--3" />
          <span className="theme-decor__sun" />
          <span className="theme-decor__cloud theme-decor__cloud--1" />
          <span className="theme-decor__cloud theme-decor__cloud--2" />
        </>
      )}
      {appTheme === "fall" && (
        <>
          <span className="theme-decor__leaf theme-decor__leaf--1" />
          <span className="theme-decor__leaf theme-decor__leaf--2" />
          <span className="theme-decor__leaf theme-decor__leaf--3" />
          <span className="theme-decor__leaf theme-decor__leaf--4" />
          <span className="theme-decor__leaf theme-decor__leaf--5" />
          <Leaf className="theme-decor__icon theme-decor__icon--fall-1" strokeWidth={2.2} />
          <Leaf className="theme-decor__icon theme-decor__icon--fall-2" strokeWidth={2.2} />
          <span className="theme-decor__pumpkin" />
          <span className="theme-decor__pumpkin theme-decor__pumpkin--sm" />
        </>
      )}
      {appTheme === "halloween" && (
        <>
          <span className="theme-decor__bat theme-decor__bat--1" />
          <span className="theme-decor__bat theme-decor__bat--2" />
          <span className="theme-decor__bat theme-decor__bat--3" />
          <span className="theme-decor__bat theme-decor__bat--4" />
          <Ghost className="theme-decor__icon theme-decor__icon--ghost" strokeWidth={1.75} />
          <Moon className="theme-decor__icon theme-decor__icon--moon" strokeWidth={1.75} />
          <span className="theme-decor__pumpkin theme-decor__pumpkin--spooky" />
          <span className="theme-decor__moon" />
          <span className="theme-decor__web" />
        </>
      )}
      {appTheme === "christmas" && <ChristmasDecor />}
      {appTheme === "softball" && (
        <>
          <span className="theme-decor__ball theme-decor__ball--1" />
          <span className="theme-decor__ball theme-decor__ball--2" />
          <span className="theme-decor__diamond" />
        </>
      )}
    </div>
  );
}

/** Buddy-the-Elf overload: snow, lights, ornaments, candy canes, stockings, tree. */
function ChristmasDecor() {
  return (
    <>
      {/* Falling snow layer */}
      <div className="theme-decor__snowfield">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className={`theme-decor__snow theme-decor__snow--${(i % 8) + 1}`} style={{ left: `${(i * 3.7) % 100}%`, animationDelay: `${(i % 9) * 0.45}s` }} />
        ))}
      </div>

      {/* Top light string across the whole hub */}
      <span className="theme-decor__garland theme-decor__garland--xl" />
      <div className="theme-decor__light-row">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            key={i}
            className={`theme-decor__bulb theme-decor__bulb--${(i % 4) + 1}`}
            style={{ left: `${4 + i * 7}%`, animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>

      {/* Lucide icons as overlays */}
      <Star className="theme-decor__icon theme-decor__icon--star-1" fill="currentColor" strokeWidth={1.5} />
      <Star className="theme-decor__icon theme-decor__icon--star-2" fill="currentColor" strokeWidth={1.5} />
      <Star className="theme-decor__icon theme-decor__icon--star-3" fill="currentColor" strokeWidth={1.5} />
      <Snowflake className="theme-decor__icon theme-decor__icon--flake-a" strokeWidth={1.75} />
      <Snowflake className="theme-decor__icon theme-decor__icon--flake-b" strokeWidth={1.75} />
      <Snowflake className="theme-decor__icon theme-decor__icon--flake-c" strokeWidth={1.75} />
      <Gift className="theme-decor__icon theme-decor__icon--gift" strokeWidth={1.75} />
      <TreePine className="theme-decor__icon theme-decor__icon--tree" strokeWidth={1.6} />
      <Sparkles className="theme-decor__icon theme-decor__icon--sparkle" strokeWidth={1.75} />
      <Candy className="theme-decor__icon theme-decor__icon--candy" strokeWidth={1.75} />

      {/* Inline SVG candy canes + stockings + ornaments */}
      <CandyCaneSvg className="theme-decor__svg theme-decor__svg--cane-1" />
      <CandyCaneSvg className="theme-decor__svg theme-decor__svg--cane-2" flip />
      <StockingSvg className="theme-decor__svg theme-decor__svg--stocking-1" color="#e01818" />
      <StockingSvg className="theme-decor__svg theme-decor__svg--stocking-2" color="#0e8a3c" />
      <OrnamentSvg className="theme-decor__svg theme-decor__svg--orn-1" color="#e01818" />
      <OrnamentSvg className="theme-decor__svg theme-decor__svg--orn-2" color="#0e8a3c" />
      <OrnamentSvg className="theme-decor__svg theme-decor__svg--orn-3" color="#e8b040" />

      {/* CSS baubles as backup density */}
      <span className="theme-decor__ornament theme-decor__ornament--1" />
      <span className="theme-decor__ornament theme-decor__ornament--2" />
      <span className="theme-decor__ornament theme-decor__ornament--3" />
    </>
  );
}

function CandyCaneSvg({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        d="M28 8c0-6-5-10-12-10S4 2 4 8v8c0 2 1.5 3.5 3.5 3.5S11 18 11 16V9.5c0-2.2 1.8-3.5 5-3.5s5 1.3 5 3.5V62c0 2.5 2 4.5 4.5 4.5S30 64.5 30 62V16c0-4-1-8-2-8z"
        fill="#fff5f5"
        stroke="#e01818"
        strokeWidth="2"
      />
      <path
        d="M11 14c2 2 4 2 6 0M11 22c2 2 4 2 6 0M11 30c2 2 4 2 6 0M11 38c2 2 4 2 6 0M11 46c2 2 4 2 6 0M11 54c2 2 4 2 6 0M22 20c2 2 4 2 6 0M22 28c2 2 4 2 6 0M22 36c2 2 4 2 6 0M22 44c2 2 4 2 6 0M22 52c2 2 4 2 6 0"
        stroke="#e01818"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StockingSvg({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="2" width="28" height="10" rx="2" fill="#f5f0e8" stroke="#c8b8a0" strokeWidth="1.5" />
      <path
        d="M14 12h20v28c0 2 1 4 3 5l6 4c3 2 4 5 3 8-1 4-5 6-9 5l-14-3c-4-1-7-4-7-8V12z"
        fill={color}
        stroke="#1a1412"
        strokeOpacity="0.15"
        strokeWidth="1.5"
      />
      <circle cx="24" cy="28" r="3" fill="#e8b040" />
      <circle cx="24" cy="40" r="2.5" fill="#fff8e8" opacity="0.85" />
    </svg>
  );
}

function OrnamentSvg({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="2" width="6" height="8" rx="1" fill="#c8a050" />
      <circle cx="18" cy="26" r="14" fill={color} />
      <ellipse cx="13" cy="20" rx="4" ry="6" fill="#fff" opacity="0.35" />
      <path d="M8 28c4 4 16 4 20 0" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
