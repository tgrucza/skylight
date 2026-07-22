"use client";

import { Chip } from "@/components/ui/Chip";
import { useFamily } from "@/hooks/useFamily";
import { useUIStore } from "@/stores/uiStore";

export function MemberFilterBar() {
  const { data } = useFamily();
  const selectedMemberIds = useUIStore((s) => s.selectedMemberIds);
  const toggleMemberFilter = useUIStore((s) => s.toggleMemberFilter);

  if (!data?.members.length) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {data.members.map((m) => (
        <Chip
          key={m.id}
          color={m.color_hex}
          label={m.name}
          active={selectedMemberIds.length === 0 || selectedMemberIds.includes(m.id)}
          onClick={() => toggleMemberFilter(m.id)}
        />
      ))}
    </div>
  );
}
