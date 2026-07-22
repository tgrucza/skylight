"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut } from "lucide-react";
import { DropdownMenu } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { EditMemberModal } from "@/components/family/EditMemberModal";
import { useFamily } from "@/hooks/useFamily";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { signOutAction } from "@/lib/actions/auth";

/** Avatar dropdown reused in TopBar, the hub nav pill, and anywhere else the account menu should be reachable (spec §3.1). */
export function AccountMenu({ size = 40 }: { size?: number }) {
  const router = useRouter();
  const { data } = useFamily();
  const me = data?.members.find((m) => m.id === data.currentMemberId);
  const { data: avatarUrls } = useAvatarUrls(me ? [me] : undefined);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!me) return null;

  return (
    <>
      <DropdownMenu
        trigger={<Avatar name={me.name} color={me.color_hex} src={avatarUrls?.[me.id]} size={size} />}
        items={[
          { label: "My profile", icon: User, onSelect: () => setProfileOpen(true) },
          { label: "Settings", icon: Settings, onSelect: () => router.push("/settings") },
          { label: "Sign out", icon: LogOut, destructive: true, onSelect: () => void signOutAction() },
        ]}
      />
      <EditMemberModal open={profileOpen} onClose={() => setProfileOpen(false)} familyId={data?.family?.id} member={me} isSelf />
    </>
  );
}
