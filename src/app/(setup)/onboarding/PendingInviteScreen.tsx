import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";

async function joinFamily(memberId: string) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  await supabaseAdmin().from("family_members").update({ user_id: session.user.id, invite_email: null }).eq("id", memberId);
  redirect("/hub");
}

export function PendingInviteScreen({ memberId, familyName }: { memberId: string; familyName: string }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px] rounded-xl border border-line bg-surface p-7 text-center">
        <h1 className="font-serif text-3xl mb-2">You&apos;ve been added to {familyName}</h1>
        <p className="text-ink-2 text-sm mb-6">An adult in your family already set up Hearth — you&apos;re joining their shared space.</p>
        <form action={joinFamily.bind(null, memberId)}>
          <Button size="lg" type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
