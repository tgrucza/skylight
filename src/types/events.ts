export interface EventInstanceDTO {
  /** Row id for a real event; `${masterId}::${occurrenceStartIso}` for a virtual recurrence occurrence. */
  id: string;
  masterId: string | null;
  memberId: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  isRecurring: boolean;
  source: "hearth" | "google";
}
