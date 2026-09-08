"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Home, ScanLine } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Start", icon: Home },
  { href: "/scan", label: "Scannen", icon: ScanLine },
  { href: "/dashboard", label: "Aufträge", icon: ClipboardList },
] as const;

/** Daumen-erreichbare Navigation am unteren Rand, respektiert die Safe Area. */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky bottom-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <nav className="mx-auto flex w-full max-w-md rounded-2xl border bg-card/95 shadow-lg backdrop-blur">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
              {active ? (
                <span className="bg-primary absolute bottom-1 size-1 rounded-full" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
