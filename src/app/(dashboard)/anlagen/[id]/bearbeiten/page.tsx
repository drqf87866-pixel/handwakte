import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { updateAnlage } from "@/app/(dashboard)/anlagen/actions";
import { AnlageForm } from "@/components/dashboard/anlage-form";
import { customer, getDb, installation } from "@/lib/db";

export const metadata: Metadata = { title: "Anlage bearbeiten" };
export const dynamic = "force-dynamic";

export default async function AnlageBearbeitenPage({
  params,
}: PageProps<"/anlagen/[id]/bearbeiten">) {
  const { id } = await params;
  const db = getDb();

  const [[anlage], kunden] = await Promise.all([
    db.select().from(installation).where(eq(installation.id, id)).limit(1),
    db
      .select({ id: customer.id, name: customer.name, kundennummer: customer.kundennummer })
      .from(customer)
      .orderBy(asc(customer.name)),
  ]);

  if (!anlage) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{anlage.bezeichnung} bearbeiten</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Stammdaten, Aufstellort und Wartungsintervall anpassen.
        </p>
      </div>
      <AnlageForm action={updateAnlage.bind(null, anlage.id)} anlage={anlage} kunden={kunden} />
    </div>
  );
}
