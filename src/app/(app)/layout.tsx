import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findPendingInvite, linkPendingMembership } from "@/lib/family";

/**
 * Guard-only layout shared by every signed-in route: confirms the user
 * belongs to a family (spec §6.1 onboarding must run first) and bounces to
 * /onboarding otherwise. Deliberately renders no chrome — /hub owns its own
 * full-bleed Home Hub header, while (shell) adds the Rail/BottomNav frame
 * for the rest of the app.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const supabase = await createServerSupabaseClient();
  const { data: membership } = await supabase.from("family_members").select("id").eq("user_id", session.user.id).limit(1);

  if (!membership || membership.length === 0) {
    // Prefer invite-link before create-family onboarding (spec §3.2, H2).
    if (session.user.email) {
      const linked = await linkPendingMembership(session.user.id, session.user.email);
      if (linked) return children;

      // Invite exists but attach failed for some reason — still send them to
      // onboarding so PendingInviteScreen can surface the join CTA.
      const pending = await findPendingInvite(session.user.email);
      if (pending) redirect("/onboarding");
    }
    redirect("/onboarding");
  }

  return children;
}
