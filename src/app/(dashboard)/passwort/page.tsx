import type { Metadata } from "next";

import { PasswortForm } from "@/components/shared/passwort-form";

export const metadata: Metadata = { title: "Passwort ändern" };
export const dynamic = "force-dynamic";

/**
 * Eigenes Passwort wechseln. Der Session-Guard kommt aus dem
 * (dashboard)-Layout, das Aendern selbst laeuft ueber
 * Better Auth (`changePassword`) direkt im Formular.
 */
export default function PasswortPage() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Passwort ändern</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gilt sofort. Andere angemeldete Geräte werden dabei abgemeldet.
        </p>
      </div>
      <PasswortForm />
    </div>
  );
}
