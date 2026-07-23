import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-5">
        <EmptyState icon={Compass} title="Page not found" body="That page doesn't exist, or it moved." />
        <Link href="/hub" className="text-sm font-semibold text-primary underline underline-offset-2">
          Back to Orbit
        </Link>
      </div>
    </div>
  );
}
