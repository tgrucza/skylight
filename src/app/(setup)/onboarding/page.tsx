import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OnboardingWizard } from "./OnboardingWizard";
import { PendingInviteScreen } from "./PendingInviteScreen";

/**
 * Guard against creating a duplicate family (spec §3.2, H2): normally the
 * (app) layout links a pending invite and this page is never reached, but
 * as a fallback (e.g. a stale bookmark straight to /onboarding), check here
 * too and offer to join instead of running the create-family wizard.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");

  const admin = supabaseAdmin();
  const { data: pending } = await admin
    .from("family_members")
    .select("id, family_id")
    .eq("invite_email", session.user.email.trim().toLowerCase())
    .is("user_id", null)
    .limit(1)
    .maybeSingle();

  if (pending) {
    const { data: family } = await admin.from("families").select("name").eq("id", pending.family_id).single();
    return <PendingInviteScreen memberId={pending.id} familyName={family?.name ?? "the family"} />;
  }

  return <OnboardingWizard />;
}
