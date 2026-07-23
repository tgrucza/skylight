"use client";

import { useEffect, useState } from "react";
import { useUIStore, type DeviceModePreference } from "@/stores/uiStore";

const PHONE_MQ = "(max-width: 767px)";

/** Resolves auto → phone on narrow viewports, wall otherwise. Explicit preference always wins. */
export function resolveDeviceMode(preference: DeviceModePreference, isNarrow: boolean): "wall" | "phone" {
  if (preference === "wall" || preference === "phone") return preference;
  return isNarrow ? "phone" : "wall";
}

export function useDeviceMode() {
  const preference = useUIStore((s) => s.deviceMode);
  const setDeviceMode = useUIStore((s) => s.setDeviceMode);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PHONE_MQ);
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const resolved = resolveDeviceMode(preference, isNarrow);
  const homeHref = resolved === "phone" ? "/home" : "/hub";

  return { preference, setDeviceMode, resolved, homeHref, isNarrow };
}
