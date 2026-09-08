"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flame, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutDashboard },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/anlagen", label: "Anlagen", icon: Flame },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Büro-Navigation"
      className="flex gap-1 overflow-x-auto border-b px-2 py-2 md:sticky md:top-16 md:h-fit md:w-60 md:shrink-0 md:flex-col md:gap-1 md:self-start md:overflow-visible md:rounded-2xl md:border md:bg-card md:p-3 md:shadow-xs"
    >
      <p className="text-muted-foreground hidden px-3 pt-1 pb-2 text-xs font-medium tracking-wide uppercase md:block">
        Büro
      </p>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
