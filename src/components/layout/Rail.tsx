"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckCircle2, UtensilsCrossed, ShoppingCart, Image as ImageIcon, Users, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/chores", label: "Chores", icon: CheckCircle2 },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/lists", label: "Lists", icon: ShoppingCart },
  { href: "/photos", label: "Photos", icon: ImageIcon },
  { href: "/family", label: "Family", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Persistent left rail — wall (1280×800) & desktop, per design system §06.5 / spec §2.1. */
export function Rail() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex md:w-[240px] shrink-0 flex-col rounded-xl border border-line bg-surface p-3.5 gap-0.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
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
