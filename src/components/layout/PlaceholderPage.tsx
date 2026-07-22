import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

/** Temporary placeholder for a route not yet built — replaced milestone by milestone (see HEARTH_ENGINEERING_SPEC.md §5). */
export function PlaceholderPage({ icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="pt-2">
      <EmptyState icon={icon} title={title} body={body} />
    </div>
  );
}
