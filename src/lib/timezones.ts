/** Curated common IANA zones for the onboarding timezone picker — a free-text field risks a typo that silently breaks date-fns-tz math (spec §7.4). */
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Mountain, no DST (Phoenix)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / Berlin" },
  { value: "Asia/Kolkata", label: "India (Kolkata)" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
] as const;

export function detectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export function closestCommonTimezone(tz: string): string {
  return COMMON_TIMEZONES.some((t) => t.value === tz) ? tz : "America/New_York";
}
