import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/email";

export { normalizeEmail };

export interface CurrentMembership {
  familyId: string;
  memberId: string;
  role: "adult" | "child";
}

export interface PendingInvite {
  memberId: string;
  familyId: string;
  role: "adult" | "child";
  familyName: string;
}

export type ClaimInviteResult =
  | { status: "joined"; membership: CurrentMembership; familyName: string }
  | { status: "already_member"; membership: CurrentMembership; familyName: string }
  | { status: "confirm_transfer"; membership: CurrentMembership; currentFamilyName: string; invitedFamilyName: string; pendingMemberId: string }
  | { status: "no_invite" }
  | { status: "cannot_transfer"; membership: CurrentMembership; currentFamilyName: string; invitedFamilyName: string; reason: string };

/** MVP assumes one family per signed-in user (spec's roadmap explicitly excludes multi-family sharing). */
export async function getCurrentMembership(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CurrentMembership | null> {
  const { data } = await supabase.from("family_members").select("id, family_id, role").eq("user_id", userId).limit(1).maybeSingle();
  if (!data) return null;
  return { familyId: data.family_id, memberId: data.id, role: data.role };
}

export async function findPendingInvite(email: string): Promise<PendingInvite | null> {
  const admin = supabaseAdmin();
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data: pending } = await admin
    .from("family_members")
    .select("id, family_id, role")
    .eq("invite_email", normalized)
    .is("user_id", null)
    .limit(1)
    .maybeSingle();
  if (!pending) return null;

  const { data: family } = await admin.from("families").select("name").eq("id", pending.family_id).single();
  return {
    memberId: pending.id,
    familyId: pending.family_id,
    role: pending.role,
    familyName: family?.name ?? "the family",
  };
}

/**
 * True when the user's current family has only them as a member — safe to
 * abandon so they can join an invited household without leaving data behind
 * for anyone else.
 */
async function isOrphanSoloFamily(familyId: string, userId: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data: members } = await admin.from("family_members").select("id, user_id").eq("family_id", familyId);
  if (!members || members.length !== 1) return false;
  return members[0].user_id === userId;
}

async function attachUserToPendingRow(
  userId: string,
  pendingMemberId: string
): Promise<CurrentMembership | null> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("family_members")
    .update({ user_id: userId, invite_email: null })
    .eq("id", pendingMemberId)
    .is("user_id", null)
    .select("id, family_id, role")
    .single();
  if (error || !data) return null;
  return { familyId: data.family_id, memberId: data.id, role: data.role };
}

/**
 * Join-family flow (spec §3.2, H2): links a signing-in user to a
 * `family_members` row an adult already pre-created for them (matched by
 * `invite_email`), instead of the layout bouncing them to /onboarding to
 * create a duplicate family. Runs with the service-role client because the
 * signing-in user has no membership yet, so RLS would return zero rows.
 *
 * Also repairs the "already created an empty solo family" case when
 * `confirmTransfer` is true (or when auto-linking a user with no membership).
 */
export async function claimPendingInvite(
  userId: string,
  email: string,
  opts: { confirmTransfer?: boolean } = {}
): Promise<ClaimInviteResult> {
  const admin = supabaseAdmin();
  const pending = await findPendingInvite(email);
  if (!pending) return { status: "no_invite" };

  const { data: existing } = await admin
    .from("family_members")
    .select("id, family_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing && existing.family_id === pending.familyId) {
    // Already on the invited family (e.g. double-submit) — clear stale invite if any.
    await admin.from("family_members").update({ invite_email: null }).eq("id", pending.memberId).is("user_id", null);
    return {
      status: "already_member",
      membership: { familyId: existing.family_id, memberId: existing.id, role: existing.role },
      familyName: pending.familyName,
    };
  }

  if (!existing) {
    const membership = await attachUserToPendingRow(userId, pending.memberId);
    if (!membership) return { status: "no_invite" };
    return { status: "joined", membership, familyName: pending.familyName };
  }

  const membership: CurrentMembership = {
    familyId: existing.family_id,
    memberId: existing.id,
    role: existing.role,
  };
  const { data: currentFamily } = await admin.from("families").select("name").eq("id", existing.family_id).single();
  const currentFamilyName = currentFamily?.name ?? "your current family";

  const orphan = await isOrphanSoloFamily(existing.family_id, userId);
  if (!orphan) {
    return {
      status: "cannot_transfer",
      membership,
      currentFamilyName,
      invitedFamilyName: pending.familyName,
      reason:
        "You're already in a family with other members. Ask an adult there to remove you first, or contact support to merge households.",
    };
  }

  if (!opts.confirmTransfer) {
    return {
      status: "confirm_transfer",
      membership,
      currentFamilyName,
      invitedFamilyName: pending.familyName,
      pendingMemberId: pending.memberId,
    };
  }

  // Abandon the empty solo family (cascade cleans members/settings), then attach.
  const { error: deleteError } = await admin.from("families").delete().eq("id", existing.family_id);
  if (deleteError) {
    return {
      status: "cannot_transfer",
      membership,
      currentFamilyName,
      invitedFamilyName: pending.familyName,
      reason: deleteError.message,
    };
  }

  const linked = await attachUserToPendingRow(userId, pending.memberId);
  if (!linked) return { status: "no_invite" };
  return { status: "joined", membership: linked, familyName: pending.familyName };
}

/** Convenience wrapper for the no-membership auto-link path (layout / api). */
export async function linkPendingMembership(userId: string, email: string): Promise<CurrentMembership | null> {
  const result = await claimPendingInvite(userId, email);
  if (result.status === "joined" || result.status === "already_member") return result.membership;
  return null;
}
