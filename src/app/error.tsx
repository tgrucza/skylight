"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/EmptyState";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-5">
        <ErrorState title="Something went wrong" body="An unexpected error happened. Try again, or head back to the hub." onRetry={reset} />
        <Link href="/hub" className="text-sm font-semibold text-primary underline underline-offset-2">
          Back to Hearth
        </Link>
      </div>
    </div>
  );
}
