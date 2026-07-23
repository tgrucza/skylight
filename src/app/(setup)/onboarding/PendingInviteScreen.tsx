"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function PendingInviteScreen({
  familyName,
  mode = "join",
  currentFamilyName,
}: {
  familyName: string;
  mode?: "join" | "transfer";
  currentFamilyName?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmTransfer: mode === "transfer" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't join the family");
      if (data.status === "confirm_transfer") {
        // Server wants an explicit confirm — retry with transfer flag.
        const retry = await fetch("/api/family/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmTransfer: true }),
        });
        const retryData = await retry.json();
        if (!retry.ok) throw new Error(retryData.error ?? "Couldn't join the family");
      }
      router.push("/hub");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join the family");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px] rounded-xl border border-line bg-surface p-7 text-center">
        <h1 className="font-serif text-3xl mb-2">
          {mode === "transfer" ? `Join ${familyName}?` : `You've been invited to ${familyName}`}
        </h1>
        <p className="text-ink-2 text-sm mb-6">
          {mode === "transfer"
            ? `An adult already invited your Google account. Continue to leave ${currentFamilyName ?? "the empty family you created"} and join their shared space.`
            : "An adult in your family already set up Orbit — you'll join their shared space instead of creating a new one."}
        </p>
        {error && (
          <div className="mb-5 text-left">
            <Alert tone="danger" title="Couldn't join" body={error} onDismiss={() => setError(null)} />
          </div>
        )}
        <Button size="lg" className="w-full" onClick={handleContinue} loading={busy}>
          {mode === "transfer" ? `Join ${familyName}` : "Continue"}
        </Button>
      </div>
    </div>
  );
}
