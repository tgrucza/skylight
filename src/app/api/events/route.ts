import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { expandOccurrences, isRecurring } from "@/lib/rrule";
import { createGoogleEvent } from "@/lib/google/outbound";
import type { EventInstanceDTO } from "@/types/events";

const querySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  memberIds: z.string().optional(),
});

/** Lists event instances overlapping [start, end], expanding recurring masters (spec §5 M2). */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { start, end, memberIds } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const { data: family } = await supabase.from("families").select("timezone").eq("id", membership.familyId).single();
  const timezone = family?.timezone ?? "America/New_York";

  const [{ data: masters }, { data: concrete }] = await Promise.all([
    supabase.from("events").select("*").not("rrule", "is", null).is("deleted_at", null),
    supabase.from("events").select("*").is("rrule", null).is("deleted_at", null).lt("starts_at", end).gt("ends_at", start),
  ]);

  const instances: EventInstanceDTO[] = [];

  for (const row of concrete ?? []) {
    instances.push({
      id: row.id,
      masterId: row.recurrence_parent_id,
      memberId: row.member_id,
      title: row.title,
      location: row.location,
      notes: row.notes,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      allDay: row.all_day,
      isRecurring: false,
      source: row.source,
    });
  }

  for (const master of masters ?? []) {
    if (!isRecurring(master.rrule)) continue;
    const durationMs = new Date(master.ends_at).getTime() - new Date(master.starts_at).getTime();
    const occurrences = expandOccurrences(master.rrule!, new Date(master.starts_at), new Date(start), new Date(end), timezone);
    for (const occStart of occurrences) {
      instances.push({
        id: `${master.id}::${occStart.toISOString()}`,
        masterId: master.id,
        memberId: master.member_id,
        title: master.title,
        location: master.location,
        notes: master.notes,
        startsAt: occStart.toISOString(),
        endsAt: new Date(occStart.getTime() + durationMs).toISOString(),
        allDay: master.all_day,
        isRecurring: true,
        source: master.source,
      });
    }
  }

  const memberFilter = memberIds ? new Set(memberIds.split(",").filter(Boolean)) : null;
  const filtered = memberFilter ? instances.filter((i) => i.memberId && memberFilter.has(i.memberId)) : instances;
  filtered.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return NextResponse.json({ events: filtered });
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  memberId: z.string().uuid().nullable().optional(),
  location: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean().optional(),
  rrule: z.string().optional(),
  integrationId: z.string().uuid().optional(),
});

/** Creates an event. If the owning member has a linked Google calendar, writes there first, then mirrors locally (spec §5 M2). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  let googleEventId: string | null = null;
  let integrationId: string | null = null;

  if (body.memberId) {
    let integrationQuery = supabase.from("calendar_integrations").select("*").eq("member_id", body.memberId).eq("status", "active");
    if (body.integrationId) integrationQuery = integrationQuery.eq("id", body.integrationId);
    const { data: integration } = await integrationQuery.limit(1).maybeSingle();

    if (integration) {
      try {
        const googleEvent = await createGoogleEvent(integration, {
          title: body.title,
          location: body.location,
          notes: body.notes,
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          allDay: body.allDay,
          rrule: body.rrule,
        });
        googleEventId = googleEvent.id ?? null;
        integrationId = integration.id;
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to write to Google Calendar" }, { status: 502 });
      }
    }
  }

  const { data: created, error } = await supabase
    .from("events")
    .insert({
      family_id: membership.familyId,
      member_id: body.memberId ?? null,
      integration_id: integrationId,
      google_event_id: googleEventId,
      title: body.title,
      location: body.location ?? null,
      notes: body.notes ?? null,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      all_day: body.allDay ?? false,
      rrule: body.rrule ?? null,
      source: "hearth",
    })
    .select("*")
    .single();

  if (error || !created) return NextResponse.json({ error: error?.message ?? "Failed to create event" }, { status: 500 });
  return NextResponse.json({ event: created });
}
