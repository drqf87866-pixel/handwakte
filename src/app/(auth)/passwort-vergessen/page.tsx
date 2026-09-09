import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { PasswortVergessenForm } from "@/components/shared/passwort-vergessen-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

/**
 * Oeffentliche Seite ohne Session-Guard (wie der Login): Wer hier landet,
 * ist per Definition abgemeldet.
 */
export default function PasswortVergessenPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <Suspense>
        <PasswortVergessenForm />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-center text-xs">
        <Link href="/login" className="underline underline-offset-4">
          Zurueck zur Anmeldung
        </Link>
      </p>
    </main>
  );
}
