/** Curated grocery stores + phrase parsing for store sections. */

export const ANY_STORE_LABEL = "Any store";

/** Display order for known stores when grouping the list. */
export const CURATED_STORES = [
  "Walmart",
  "Sam's Club",
  "Costco",
  "Aldi",
  "Target",
  "Kroger",
  "Publix",
  "Trader Joe's",
  "Whole Foods",
] as const;

export type CuratedStore = (typeof CURATED_STORES)[number];

const LAST_STORE_KEY = "orbit.grocery.lastStore";

/** Lowercase aliases → canonical display name. */
const STORE_ALIASES: Record<string, string> = {
  walmart: "Walmart",
  "wal-mart": "Walmart",
  "walmart+": "Walmart",
  "walmart plus": "Walmart",
  "w+": "Walmart",
  "sam's club": "Sam's Club",
  "sams club": "Sam's Club",
  sams: "Sam's Club",
  "sam's": "Sam's Club",
  costco: "Costco",
  aldi: "Aldi",
  target: "Target",
  kroger: "Kroger",
  publix: "Publix",
  "trader joe's": "Trader Joe's",
  "trader joes": "Trader Joe's",
  "trader joe": "Trader Joe's",
  "whole foods": "Whole Foods",
  wholefoods: "Whole Foods",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** All matchable names, longest first (so "Sam's Club" wins over "Sam's"). */
function storeMatchNames(): string[] {
  const names = new Set<string>([...CURATED_STORES, ...Object.keys(STORE_ALIASES)]);
  return [...names].sort((a, b) => b.length - a.length);
}

/**
 * Normalize a store name for storage.
 * Returns null for Any store / General / empty.
 */
export function normalizeStore(store: string | null | undefined): string | null {
  if (store == null) return null;
  const trimmed = store.trim();
  if (!trimmed) return null;
  if (/^(any\s*store|general|anywhere)$/i.test(trimmed)) return null;
  const alias = STORE_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  const curated = CURATED_STORES.find((s) => s.toLowerCase() === trimmed.toLowerCase());
  if (curated) return curated;
  return trimmed.replace(/\s+/g, " ");
}

/** Section header label for UI. */
export function storeSectionLabel(store: string | null | undefined): string {
  return normalizeStore(store) ?? ANY_STORE_LABEL;
}

/** Stable key for dedupe / maps (empty string = Any store). */
export function storeDedupeKey(store: string | null | undefined): string {
  return (normalizeStore(store) ?? "").toLowerCase();
}

export function getLastUsedStore(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeStore(window.localStorage.getItem(LAST_STORE_KEY));
  } catch {
    return null;
  }
}

export function setLastUsedStore(store: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    const n = normalizeStore(store);
    if (n) window.localStorage.setItem(LAST_STORE_KEY, n);
    else window.localStorage.removeItem(LAST_STORE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Parse phrases like:
 * - "milk from Costco"
 * - "add paper towels from Sam's Club"
 * - "Sam's Club: paper towels"
 * - "Costco - eggs"
 * Returns cleaned label + normalized store (null = Any store).
 */
export function parseGroceryPhrase(raw: string): { label: string; store: string | null } {
  let text = raw.trim().replace(/^add\s+/i, "").trim();
  if (!text) return { label: "", store: null };

  for (const name of storeMatchNames()) {
    const rePrefix = new RegExp(`^${escapeRegExp(name)}\\s*[:\\-–—]\\s*(.+)$`, "i");
    const mPrefix = text.match(rePrefix);
    if (mPrefix?.[1]?.trim()) {
      return { label: mPrefix[1].trim(), store: normalizeStore(name) };
    }

    const reFrom = new RegExp(`^(.+?)\\s+from\\s+${escapeRegExp(name)}\\s*$`, "i");
    const mFrom = text.match(reFrom);
    if (mFrom?.[1]?.trim()) {
      return { label: mFrom[1].trim(), store: normalizeStore(name) };
    }

    const reAt = new RegExp(`^(.+?)\\s+at\\s+${escapeRegExp(name)}\\s*$`, "i");
    const mAt = text.match(reAt);
    if (mAt?.[1]?.trim()) {
      return { label: mAt[1].trim(), store: normalizeStore(name) };
    }
  }

  // Custom "from X" / "Store: item" when X isn't curated
  const fromCustom = text.match(/^(.+?)\s+from\s+(.+)$/i);
  if (fromCustom?.[1]?.trim() && fromCustom[2]?.trim()) {
    const maybeStore = fromCustom[2].trim();
    // Avoid treating long phrases as stores
    if (maybeStore.length <= 40 && !/\b(the|and|or|with)\b/i.test(maybeStore)) {
      return { label: fromCustom[1].trim(), store: normalizeStore(maybeStore) };
    }
  }

  const colonCustom = text.match(/^([^:]{2,40})\s*:\s*(.+)$/);
  if (colonCustom?.[1]?.trim() && colonCustom[2]?.trim()) {
    const head = colonCustom[1].trim();
    // Prefer store:item when the head looks like a place name (few words, no commas)
    if (!head.includes(",") && head.split(/\s+/).length <= 4) {
      return { label: colonCustom[2].trim(), store: normalizeStore(head) };
    }
  }

  return { label: text, store: null };
}

/** Options for a store picker (value "" = Any store). */
export function storePickerOptions(extraStores: string[] = []): { value: string; label: string }[] {
  const seen = new Set<string>();
  const opts: { value: string; label: string }[] = [{ value: "", label: ANY_STORE_LABEL }];
  seen.add("");

  for (const s of CURATED_STORES) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    opts.push({ value: s, label: s });
  }

  for (const raw of extraStores) {
    const n = normalizeStore(raw);
    if (!n) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    opts.push({ value: n, label: n });
  }

  opts.push({ value: "__custom__", label: "Other store…" });
  return opts;
}

/**
 * Order store section keys for display: Any store first, then curated order, then other A–Z.
 */
export function orderStoreSections(storesPresent: string[]): string[] {
  const keys = [...new Set(storesPresent.map((s) => normalizeStore(s) ?? ""))];
  const curatedRank = new Map(CURATED_STORES.map((s, i) => [s.toLowerCase(), i]));

  return keys.sort((a, b) => {
    if (a === "" && b !== "") return -1;
    if (b === "" && a !== "") return 1;
    const ra = curatedRank.get(a.toLowerCase());
    const rb = curatedRank.get(b.toLowerCase());
    if (ra != null && rb != null) return ra - rb;
    if (ra != null) return -1;
    if (rb != null) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}
