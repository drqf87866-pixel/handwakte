import Link from "next/link";
import { Flame } from "lucide-react";

import { SignOutButton } from "@/components/shared/sign-out-button";

function Initial({ name }: { name: string }) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      aria-hidden
      className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-full text-sm font-semibold"
    >
      {initial}
    </span>
  );
}

export function AppHeader({ user }: { user: { name: string; email: string } }) {
  const displayName = user.name || user.email;
  return (
    <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl shadow-xs">
            <Flame className="size-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight">Digitale Bauakte</span>
            <span className="text-muted-foreground hidden text-xs sm:block">
              Heizungsbau &amp; Sanitär
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Initial name={displayName} />
          <span className="hidden max-w-44 truncate text-sm sm:inline">{displayName}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
