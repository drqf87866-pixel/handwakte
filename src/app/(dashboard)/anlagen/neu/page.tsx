import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";

import { createAnlage } from "@/app/(dashboard)/anlagen/actions";
import { AnlageForm } from "@/components/dashboard/anlage-form";
import { Button } from "@/components/ui/button";
import { customer, getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Neue Anlage" };
export const dynamic = "force-dynamic";

async function ladeKunden() {
  return getDb()
    .select({ id: customer.id, name: customer.name, kundennummer: customer.kundennummer })
    .from(customer)
    .orderBy(asc(customer.name));
}

export default async function NeueAnlagePage({ searchParams }: PageProps<"/anlagen/neu">) {
  const { kunde } = await searchParams;
  const kunden = await ladeKunden();

  // Eine Anlage ohne Kunden anzulegen ist nicht moeglich - customerId ist
  // Pflicht. Statt eines leeren Auswahlfeldes direkt den Weg dorthin zeigen.
  if (kunden.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Neue Anlage</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Eine Anlage gehört immer zu einem Kunden. Bitte zuerst einen Kunden anlegen.
          </p>
        </div>
        <Button asChild>
          <Link href="/kunden/neu">Neuer Kunde</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Neue Anlage</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Stammdaten, Aufstellort und Wartungsintervall erfassen.
        </p>
      </div>
      <AnlageForm
        action={createAnlage}
        kunden={kunden}
        vorausgewaehlterKunde={typeof kunde === "string" ? kunde : undefined}
      />
    </div>
  );
}
