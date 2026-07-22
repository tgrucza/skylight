"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, CheckCircle2, UtensilsCrossed, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/hub", label: "Home", icon: Home },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/chores", label: "Chores", icon: CheckCircle2 },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/lists", label: "Lists", icon: ShoppingCart },
];

/** Bottom tab bar — mobile single-column layout, per design system §06.6. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex justify-around rounded-xl bg-ink p-2.5" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
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
