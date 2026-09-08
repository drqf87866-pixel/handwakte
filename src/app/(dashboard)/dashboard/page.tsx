import type { Metadata } from "next";
import { asc, eq, inArray } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customer, getDb, installation, maintenanceJob } from "@/lib/db";

export const metadata: Metadata = { title: "Uebersicht" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

const STATUS_VARIANT = {
  ueberfaellig: "destructive",
  geplant: "secondary",
  terminiert: "outline",
} as const;

/** Offene Wartungsauftraege, die der Cron-Lauf angelegt hat. */
async function ladeOffeneAuftraege() {
  return getDb()
    .select({
      id: maintenanceJob.id,
      faelligAm: maintenanceJob.faelligAm,
      status: maintenanceJob.status,
      anlage: installation.bezeichnung,
      standort: installation.standort,
      kunde: customer.name,
    })
    .from(maintenanceJob)
    .innerJoin(installation, eq(installation.id, maintenanceJob.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(inArray(maintenanceJob.status, ["geplant", "terminiert", "ueberfaellig"]))
    .orderBy(asc(maintenanceJob.faelligAm))
    .limit(50);
}

export default async function DashboardPage() {
  let auftraege: Awaited<ReturnType<typeof ladeOffeneAuftraege>> = [];
  let fehler: string | null = null;

  try {
    auftraege = await ladeOffeneAuftraege();
  } catch (error) {
    // Ohne konfigurierte Datenbank soll die Seite trotzdem rendern.
    fehler = error instanceof Error ? error.message : String(error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Offene Wartungen</h1>
        <p className="text-muted-foreground text-sm">
          Automatisch erzeugt vom taeglichen Wartungs-Scan.
        </p>
      </div>

      {fehler ? (
        <p className="text-destructive rounded-md border border-dashed p-4 text-sm">
          Datenbank nicht erreichbar: {fehler}
        </p>
      ) : auftraege.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Aktuell keine offenen Wartungsauftraege.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faellig</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Anlage</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auftraege.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap">{dateFmt.format(a.faelligAm)}</TableCell>
                <TableCell>{a.kunde}</TableCell>
                <TableCell>{a.anlage}</TableCell>
                <TableCell className="text-muted-foreground">{a.standort ?? "-"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      STATUS_VARIANT[a.status as keyof typeof STATUS_VARIANT] ?? "secondary"
                    }
                  >
                    {a.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
