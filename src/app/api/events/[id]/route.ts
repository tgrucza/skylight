import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { updateGoogleEvent, deleteGoogleEvent } from "@/lib/google/outbound";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/** `${masterId}::${occurrenceStartIso}` for a virtual recurrence occurrence, or a bare row id otherwise. */
function parseEventId(id: string): { rowId: string; occurrenceStart: string | null } {
  const [rowId, occurrenceStart] = id.split("::");
  return { rowId: rowId!, occurrenceStart: occurrenceStart ?? null };
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  location: z.string().trim().max(300).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  scope: z.enum(["all", "this"]).default("all"),
});

async function getFamilyTimezone(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, familyId: string) {
  const { data } = await supabase.from("families").select("timezone").eq("id", familyId).single();
  return data?.timezone ?? "America/New_York";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rowId, occurrenceStart } = parseEventId(id);

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const { data: existing } = await supabase.from("events").select("*").eq("id", rowId).single();
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: integration } = existing.integration_id
    ? await supabase.from("calendar_integrations").select("*").eq("id", existing.integration_id).single()
    : { data: null };

  // "This event only" on a recurring occurrence: detach it into its own standalone row
  // and exclude the original date from the master's rrule — the same model Google itself
  // uses for single-instance edits (mirrors lib/rrule.ts's EXDATE-aware expansion).
  if (body.scope === "this" && occurrenceStart && existing.rrule) {
    const timezone = await getFamilyTimezone(supabase, membership.familyId);
    const zonedOriginal = toZonedTime(new Date(occurrenceStart), timezone);
    const exdateLine = `EXDATE:${format(zonedOriginal, "yyyyMMdd'T'HHmmss'Z'")}`;

    await supabase
      .from("events")
      .update({ rrule: `${existing.rrule}\n${exdateLine}` })
      .eq("id", existing.id);

    const durationMs = new Date(existing.ends_at).getTime() - new Date(existing.starts_at).getTime();
    const newStart = body.startsAt ?? occurrenceStart;
    const newEnd = body.endsAt ?? new Date(new Date(newStart).getTime() + durationMs).toISOString();

    const { data: detached, error } = await supabase
      .from("events")
      .insert({
        family_id: existing.family_id,
        member_id: existing.member_id,
        integration_id: null, // known limitation: single-instance edits to a Google-linked series stay local-only for now (see lib/google/sync.ts)
        google_event_id: null,
        title: body.title ?? existing.title,
        location: body.location !== undefined ? body.location : existing.location,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        starts_at: newStart,
        ends_at: newEnd,
        all_day: body.allDay ?? existing.all_day,
        rrule: null,
        recurrence_parent_id: existing.id,
        source: "hearth",
      })
      .select("*")
      .single();

    if (error || !detached) return NextResponse.json({ error: error?.message ?? "Failed to detach occurrence" }, { status: 500 });
    return NextResponse.json({ event: detached });
  }

  const nextValues = {
    title: body.title ?? existing.title,
    location: body.location !== undefined ? body.location : existing.location,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    starts_at: body.startsAt ?? existing.starts_at,
    ends_at: body.endsAt ?? existing.ends_at,
    all_day: body.allDay ?? existing.all_day,
  };

  if (integration && existing.google_event_id) {
    try {
      await updateGoogleEvent(integration, existing.google_event_id, {
        title: nextValues.title,
        location: nextValues.location,
        notes: nextValues.notes,
        startsAt: nextValues.starts_at,
        endsAt: nextValues.ends_at,
        allDay: nextValues.all_day,
        rrule: existing.rrule,
      });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update Google Calendar" }, { status: 502 });
    }
  } else if (!existing.google_event_id && existing.member_id) {
    // Event wasn't linked to Google before (member had no integration at creation time); nothing to do — stays Hearth-only.
  }

  const { data: updated, error } = await supabase.from("events").update(nextValues).eq("id", rowId).select("*").single();
  if (error || !updated) return NextResponse.json({ error: error?.message ?? "Failed to update event" }, { status: 500 });
  return NextResponse.json({ event: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rowId, occurrenceStart } = parseEventId(id);
  const scope = req.nextUrl.searchParams.get("scope") === "this" ? "this" : "all";

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const { data: existing } = await supabase.from("events").select("*").eq("id", rowId).single();
  if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (scope === "this" && occurrenceStart && existing.rrule) {
    const timezone = await getFamilyTimezone(supabase, membership.familyId);
    const zonedOriginal = toZonedTime(new Date(occurrenceStart), timezone);
    const exdateLine = `EXDATE:${format(zonedOriginal, "yyyyMMdd'T'HHmmss'Z'")}`;
    await supabase.from("events").update({ rrule: `${existing.rrule}\n${exdateLine}` }).eq("id", existing.id);
    return NextResponse.json({ ok: true });
  }

  if (existing.integration_id && existing.google_event_id) {
    const { data: integration } = await supabase.from("calendar_integrations").select("*").eq("id", existing.integration_id).single();
    if (integration) {
      try {
        await deleteGoogleEvent(integration, existing.google_event_id);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to delete on Google Calendar" }, { status: 502 });
      }
    }
  }

  const { error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", rowId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also soft-delete any exception instances hanging off this master.
  if (!existing.recurrence_parent_id) {
    await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("recurrence_parent_id", rowId);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { rowId } = parseEventId(id);

  const supabase = await createServerSupabaseClient();
  const { data: event, error } = await supabase.from("events").select("*").eq("id", rowId).single();
  if (error || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event });
}
