import { addDays, addMonths, endOfMonth, endOfWeek, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * All calendar-grid math happens in the family's timezone (spec §7.4), not
 * the browser's local zone: we convert the UTC instant to zoned "wall clock"
 * time, do day/week/month arithmetic on that, then convert range edges back
 * to real UTC instants for querying `events` (which stores timestamptz).
 */
export function nowInTz(timezone: string): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Day-of-week (0=Sun..6=Sat) for an instant, in the family's timezone.
 * Don't compute this via `new Date(isoDateString).getDay()` — date-only ISO
 * strings parse as UTC midnight, so reading `.getDay()` back in a browser
 * west of UTC rolls it back to the previous day (see chores schedule bug).
 */
export function zonedDayOfWeek(instant: Date, timezone: string): number {
  return toZonedTime(instant, timezone).getDay();
}

/** "yyyy-MM-dd" for an instant, in the family's timezone — not `instant.toISOString().slice(0, 10)`, which uses UTC and can land on the wrong calendar day near midnight. */
export function zonedIsoDate(instant: Date, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}

function toRange(zonedStart: Date, zonedEnd: Date, timezone: string) {
  return { start: fromZonedTime(zonedStart, timezone), end: fromZonedTime(zonedEnd, timezone) };
}

export function monthGridRange(anchor: Date, timezone: string, weekStartsOn: 0 | 1 = 0) {
  const zoned = toZonedTime(anchor, timezone);
  const start = startOfWeek(startOfMonth(zoned), { weekStartsOn });
  const end = endOfWeek(endOfMonth(zoned), { weekStartsOn });
  return toRange(start, end, timezone);
}

export function weekRange(anchor: Date, timezone: string, weekStartsOn: 0 | 1 = 0) {
  const zoned = toZonedTime(anchor, timezone);
  const start = startOfWeek(zoned, { weekStartsOn });
  const end = endOfWeek(zoned, { weekStartsOn });
  return toRange(start, end, timezone);
}

export function dayRange(anchor: Date, timezone: string) {
  // startOfDay, not the raw zoned instant — otherwise this is a rolling
  // 24h-from-now window instead of the calendar day, silently dropping any
  // event earlier today once it's past that time (e.g. a 1:45pm event is
  // gone from "today" by 4pm).
  const zoned = startOfDay(toZonedTime(anchor, timezone));
  return toRange(zoned, addDays(zoned, 1), timezone);
}

/** Zoned local midnight dates spanning [start, end], for laying out a grid — inputs/outputs are zoned "wall clock" Dates, not UTC instants. */
export function eachZonedDayBetween(zonedStart: Date, zonedEnd: Date): Date[] {
  const days: Date[] = [];
  let cursor = zonedStart;
  while (cursor <= zonedEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export const sameDay = isSameDay;
export const nextMonth = (d: Date) => addMonths(d, 1);
export const prevMonth = (d: Date) => addMonths(d, -1);
export const nextWeek = (d: Date) => addDays(d, 7);
export const prevWeek = (d: Date) => addDays(d, -7);
export const nextDay = (d: Date) => addDays(d, 1);
export const prevDay = (d: Date) => addDays(d, -1);

export function formatMonthTitle(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "MMMM yyyy");
}
export function formatTime(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "h:mm a");
}
export function formatDayTitle(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "EEEE, MMM d");
}
export function formatDayNumber(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "d");
}
export function formatWeekdayShort(d: Date, timezone: string): string {
  return formatInTimeZone(d, timezone, "EEE").toUpperCase();
}
export function isSameZonedDay(a: Date, b: Date, timezone: string): boolean {
  return isSameDay(toZonedTime(a, timezone), toZonedTime(b, timezone));
}
