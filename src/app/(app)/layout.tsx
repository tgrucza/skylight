import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

  if (!membership || membership.length === 0) redirect("/onboarding");

  return children;
}
