import { Suspense } from "react";
import type { Metadata } from "next";

import { NeuesPasswortForm } from "@/components/shared/neues-passwort-form";

export const metadata: Metadata = { title: "Neues Passwort" };

/**
 * Loest den Reset-Link aus der Mail ein. Oeffentlich wie der Login -
 * das Token in der URL ist der Nachweis.
 */
export default function NeuesPasswortPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <Suspense>
        <NeuesPasswortForm />
      </Suspense>
    </main>
  );
}
