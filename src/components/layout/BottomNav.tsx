"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckCircle2, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { cn } from "@/lib/cn";

/** Bottom tab bar — fixed to the phone viewport; hidden from md up (Rail takes over). */
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
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-line/40 bg-ink pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Main"
    >
      <div className="flex justify-around px-1.5 pt-1.5 pb-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = item.isHome
            ? pathname === "/home" || pathname === "/hub"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-h-11 min-w-[56px] px-2 rounded-lg transition-colors",
                active ? "text-[#F3ECE0]" : "text-[rgba(243,236,224,0.5)]"
              )}
            >
              <item.icon className="size-[22px]" fill={active ? "rgba(201,122,82,0.25)" : "none"} aria-hidden />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
