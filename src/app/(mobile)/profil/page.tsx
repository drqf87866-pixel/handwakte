import type { Metadata } from "next";

import { ProfilInhalt } from "@/components/shared/profil-inhalt";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Profil" };
export const dynamic = "force-dynamic";

/** Profil-Seite im Monteur-Layout (Bottom-Nav). */
export default async function ProfilPage() {
  const session = await requireSession("/profil");
  const rolle = (session.user as { role?: string }).role ?? "monteur";

  return (
    <ProfilInhalt
      name={session.user.name}
      email={session.user.email}
      rolle={rolle}
    />
  );
}
