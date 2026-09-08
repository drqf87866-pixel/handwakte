import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { updateKunde } from "@/app/(dashboard)/kunden/actions";
import { KundeForm } from "@/components/dashboard/kunde-form";
import { customer, getDb } from "@/lib/db";

export const metadata: Metadata = { title: "Kunde bearbeiten" };
export const dynamic = "force-dynamic";

export default async function KundeBearbeitenPage({
  params,
}: PageProps<"/kunden/[id]/bearbeiten">) {
  const { id } = await params;
  const [kunde] = await getDb().select().from(customer).where(eq(customer.id, id)).limit(1);

  if (!kunde) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{kunde.name} bearbeiten</h1>
        <p className="text-muted-foreground mt-1 font-mono text-[13px]">
          {kunde.kundennummer}
        </p>
      </div>
      <KundeForm action={updateKunde.bind(null, kunde.id)} kunde={kunde} />
    </div>
  );
}
