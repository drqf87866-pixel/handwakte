import type { Metadata } from "next";

import { createKunde } from "@/app/(dashboard)/kunden/actions";
import { KundeForm } from "@/components/dashboard/kunde-form";
import { customer, getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Neuer Kunde" };
export const dynamic = "force-dynamic";

/**
 * Naechste freie Kundennummer im Format K-0001.
 *
 * Nur ein Vorschlag - das Feld bleibt editierbar, weil viele Betriebe ihre
 * Nummern aus der alten Buchhaltung uebernehmen. Der Unique-Index auf
 * `kundennummer` faengt Kollisionen ab.
 */
async function naechsteKundennummer(): Promise<string> {
  const zeilen = await getDb().select({ kundennummer: customer.kundennummer }).from(customer);

  const hoechste = zeilen.reduce((max, { kundennummer }) => {
    const treffer = /^K-(\d+)$/.exec(kundennummer);
    return treffer ? Math.max(max, Number(treffer[1])) : max;
  }, 0);

  return `K-${String(hoechste + 1).padStart(4, "0")}`;
}

export default async function NeuerKundePage() {
  let vorschlag = "K-0001";

  try {
    vorschlag = await naechsteKundennummer();
  } catch {
    // Ohne Datenbank bleibt es beim Startwert; das Feld ist ohnehin editierbar.
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Neuer Kunde</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Stammdaten und Anschrift des Kunden erfassen.
        </p>
      </div>
      <KundeForm action={createKunde} kundennummerVorschlag={vorschlag} />
    </div>
  );
}
