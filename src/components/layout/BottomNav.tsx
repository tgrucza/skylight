"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckCircle2, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { cn } from "@/lib/cn";

/** Bottom tab bar — mobile single-column layout, per design system §06.6. */
export function BottomNav() {
  const pathname = usePathname();
  const { homeHref } = useDeviceMode();

  const navItems = [
    { href: homeHref, label: "Home", icon: Home, isHome: true },
    { href: "/calendar", label: "Calendar", icon: Calendar, isHome: false },
    { href: "/chores", label: "Chores", icon: CheckCircle2, isHome: false },
    { href: "/meals", label: "Meals", icon: UtensilsCrossed, isHome: false },
    { href: "/lists", label: "Lists", icon: ShoppingCart, isHome: false },
  ];

  return (
    <nav className="md:hidden flex justify-around rounded-xl bg-ink p-2.5" aria-label="Main">
      {navItems.map((item) => {
        const active = item.isHome
          ? pathname === "/home" || pathname === "/hub"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn("flex flex-col items-center gap-1 px-3 py-1.5", active ? "text-[#F3ECE0]" : "text-[rgba(243,236,224,0.5)]")}
          >
            <item.icon className="size-[22px]" fill={active ? "rgba(201,122,82,0.25)" : "none"} aria-hidden />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
