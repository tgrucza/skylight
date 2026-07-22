import { RRule, rrulestr } from "rrule";
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "custom";

/** UI-facing recurrence options. `byweekday` uses JS convention (0=Sun..6=Sat) to match the rest of the app and Postgres's `schedule_days`. */
export interface RecurrenceOptions {
  freq: RecurrenceFreq;
  interval?: number;
  byweekday?: number[];
  until?: Date;
  count?: number;
}

const FREQ_MAP: Record<RecurrenceFreq, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  custom: RRule.WEEKLY,
};

const RRULE_WEEKDAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

function jsDowToRRuleDay(dow: number) {
  return RRULE_WEEKDAYS[dow % 7];
}

/** Presets shown in RecurrencePicker: daily / weekly on [days] / monthly / a raw custom RRULE string. */
export function buildRRule(options: RecurrenceOptions): string {
  const rule = new RRule({
    freq: FREQ_MAP[options.freq],
    interval: options.interval ?? 1,
    byweekday: options.byweekday?.map(jsDowToRRuleDay),
    until: options.until,
    count: options.count,
  });
  return rule.toString().replace(/^RRULE:/, "");
}

export const RECURRENCE_PRESETS: { label: string; build: () => string }[] = [
  { label: "Daily", build: () => buildRRule({ freq: "daily" }) },
  { label: "Weekdays", build: () => buildRRule({ freq: "weekly", byweekday: [1, 2, 3, 4, 5] }) },
  { label: "Weekly", build: () => buildRRule({ freq: "weekly" }) },
  { label: "Monthly", build: () => buildRRule({ freq: "monthly" }) },
];

/**
 * date-fns-tz's `toZonedTime` shifts a Date's epoch so that reading it back
 * through *local* (system-timezone) getters — e.g. plain date-fns `format`,
 * or another `fromZonedTime` call — yields the target zone's wall-clock
 * value, regardless of what timezone the Node process itself runs in. Never
 * read a toZonedTime() result through UTC getters/formatInTimeZone(...,
 * "UTC", ...) — that bypasses the trick and silently gives the wrong time.
 * This formats a zoned Date into the floating (no-Z-meaning) wall-clock
 * string RRULE's DTSTART expects.
 */
function floatingRRuleStamp(zonedDate: Date): string {
  return format(zonedDate, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Expands a recurring event's occurrences within [rangeStart, rangeEnd]
 * (real UTC instants). Runs the rrule.js math against zoned "wall clock"
 * values (spec §7.4: date math in the family's timezone) so a "every Monday
 * 9am" rule stays at 9am local across DST, then converts results back to
 * true UTC instants. `rruleText` may include an EXDATE line (Google
 * sometimes represents a cancelled single instance this way).
 */
export function expandOccurrences(rruleText: string, dtstart: Date, rangeStart: Date, rangeEnd: Date, timezone: string): Date[] {
  const zonedDtstart = toZonedTime(dtstart, timezone);
  const zonedRangeStart = toZonedTime(rangeStart, timezone);
  const zonedRangeEnd = toZonedTime(rangeEnd, timezone);

  const fullText = `DTSTART:${floatingRRuleStamp(zonedDtstart)}\n${rruleText}`;
  const set = rrulestr(fullText, { forceset: true });

  const zonedOccurrences = set.between(zonedRangeStart, zonedRangeEnd, true);
  return zonedOccurrences.map((d) => fromZonedTime(d, timezone));
}

export function isRecurring(rruleText: string | null): boolean {
  return !!rruleText && rruleText.trim().length > 0;
}
