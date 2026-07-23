import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findPendingInvite } from "@/lib/family";
import { OnboardingWizard } from "./OnboardingWizard";
import { PendingInviteScreen } from "./PendingInviteScreen";

/**
 * Guard against creating a duplicate family (spec §3.2, H2): normally the
 * (app) layout links a pending invite and this page is never reached, but
 * as a fallback (e.g. a stale bookmark straight to /onboarding), check here
 * too and offer to join instead of running the create-family wizard.
 *
 * Also recovers users who already created an empty solo family while a
 * pending invite exists for their email.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");

  const admin = supabaseAdmin();
  const pending = await findPendingInvite(session.user.email);

  const { data: existing } = await admin
    .from("family_members")
    .select("id, family_id")
    .eq("user_id", session.user.id)
    .limit(1)
    .maybeSingle();

  if (pending && existing && existing.family_id === pending.familyId) {
    redirect("/hub");
  }

  if (pending && !existing) {
    return <PendingInviteScreen familyName={pending.familyName} mode="join" />;
  }

  if (pending && existing) {
    const { data: currentFamily } = await admin.from("families").select("name").eq("id", existing.family_id).single();
    const { count } = await admin
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("family_id", existing.family_id);

    if ((count ?? 0) === 1) {
      return (
        <PendingInviteScreen
          familyName={pending.familyName}
          mode="transfer"
          currentFamilyName={currentFamily?.name ?? "your current family"}
        />
      );
    }
    // Has a real multi-member family — don't trap them on onboarding.
    redirect("/hub");
  }

  if (existing) {
    redirect("/hub");
  }

  return <OnboardingWizard signedInEmail={session.user.email} />;
}
