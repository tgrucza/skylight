"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { AccountMenu } from "./AccountMenu";
import { useFamily } from "@/hooks/useFamily";

export function TopBar() {
  const { data } = useFamily();

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4.5 py-3.5">
      <div className="font-serif text-xl">{data?.family?.name ?? "Hearth"}</div>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell familyId={data?.family?.id} />
        <Link href="/settings" aria-label="Settings" className="flex items-center justify-center size-11 rounded-md border border-line bg-paper">
          <Settings className="size-5 text-ink-2" />
        </Link>
        <AccountMenu />
      </div>
    </div>
  );
}
