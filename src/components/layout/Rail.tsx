"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckCircle2, UtensilsCrossed, ShoppingCart, Image as ImageIcon, Users, Settings } from "lucide-react";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { cn } from "@/lib/cn";

/** Persistent left rail — wall (1280×800) & desktop, per design system §06.5 / spec §2.1. */
export function Rail() {
  const pathname = usePathname();
  const { homeHref } = useDeviceMode();

  const navItems = [
    { href: homeHref, label: "Home", icon: Home, isHome: true },
    { href: "/calendar", label: "Calendar", icon: Calendar, isHome: false },
    { href: "/chores", label: "Chores", icon: CheckCircle2, isHome: false },
    { href: "/meals", label: "Meals", icon: UtensilsCrossed, isHome: false },
    { href: "/lists", label: "Lists", icon: ShoppingCart, isHome: false },
    { href: "/photos", label: "Photos", icon: ImageIcon, isHome: false },
    { href: "/family", label: "Family", icon: Users, isHome: false },
    { href: "/settings", label: "Settings", icon: Settings, isHome: false },
  ];

  return (
    <nav className="hidden md:flex md:w-[240px] shrink-0 flex-col rounded-xl border border-line bg-surface p-3.5 gap-0.5" aria-label="Main">
      {navItems.map((item) => {
        const active = item.isHome
          ? pathname === "/home" || pathname === "/hub"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3.5 py-3 text-[14.5px] font-semibold transition-colors",
              active ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-surface-2"
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
