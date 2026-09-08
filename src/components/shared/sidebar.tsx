"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flame, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Uebersicht", icon: LayoutDashboard },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/anlagen", label: "Anlagen", icon: Flame },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b p-2 md:h-full md:w-56 md:flex-col md:border-r md:border-b-0 md:p-4">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
