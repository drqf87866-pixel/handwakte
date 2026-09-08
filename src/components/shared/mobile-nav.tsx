"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Start", icon: Home },
  { href: "/scan", label: "Scannen", icon: ScanLine },
  { href: "/dashboard", label: "Auftraege", icon: ClipboardList },
] as const;

/** Daumen-erreichbare Navigation am unteren Rand, respektiert die Safe Area. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-background sticky bottom-0 border-t pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
