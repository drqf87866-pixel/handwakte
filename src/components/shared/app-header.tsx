import Link from "next/link";

import { SignOutButton } from "@/components/shared/sign-out-button";

export function AppHeader({ user }: { user: { name: string; email: string } }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Digitale Bauakte
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground hidden text-sm sm:inline">
          {user.name || user.email}
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
