import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-[420px] text-center">
        <div
          className="mx-auto mb-8 size-[88px] rounded-3xl shadow-[0_8px_24px_rgba(43,39,35,0.14)] bg-cover bg-center"
          style={{ backgroundImage: "url(/icons/icon-192.png)" }}
          role="img"
          aria-label="Orbit"
        />
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-primary mb-4">Family Command Center</div>
        <h1 className="font-serif text-[44px] leading-[1.05] mb-3">Orbit</h1>
        <p className="font-serif text-[22px] leading-snug text-ink-2 mb-4">The calm center of a busy home.</p>
        <p className="text-ink-2 mb-10 leading-relaxed">
          Sign in with Google to set up your family&apos;s schedules, chores, meals, and lists — all in one warm, shared screen.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/hub" });
          }}
        >
          <Button type="submit" size="lg" className="w-full gap-3">
            {GOOGLE_ICON}
            Continue with Google
          </Button>
        </form>

        <p className="text-xs text-ink-3 mt-6 leading-relaxed">
          We&apos;ll ask to see your Google Calendar so events stay in sync automatically. Kids can join later with a PIN — no account needed.
        </p>
      </div>
    </div>
  );
}
