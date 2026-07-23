"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveDeviceMode } from "@/hooks/useDeviceMode";
import { useUIStore } from "@/stores/uiStore";

/** Client redirect so device-mode preference (and screen size for auto) can be read. */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    function go() {
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const preference = useUIStore.getState().deviceMode;
      const resolved = resolveDeviceMode(preference, narrow);
      router.replace(resolved === "phone" ? "/home" : "/hub");
    }

    if (useUIStore.persist.hasHydrated()) {
      go();
      return;
    }
    return useUIStore.persist.onFinishHydration(() => go());
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper text-sm text-ink-3">
      Opening…
    </div>
  );
}
