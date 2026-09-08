import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { QrCode } from "lucide-react";

import { setAnlageAktiv } from "@/app/(dashboard)/anlagen/actions";
import { ActionButton } from "@/components/dashboard/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customer, getDb, installation, maintenanceJob, serviceReport } from "@/lib/db";

export const metadata: Metadata = { title: "Anlage" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

const STATUS_VARIANT = {
  ueberfaellig: "destructive",
  geplant: "secondary",
  terminiert: "outline",
  erledigt: "outline",
  storniert: "outline",
} as const;

const STATUS_LABEL: Record<string, string> = {
  ueberfaellig: "Überfällig",
  geplant: "Geplant",
  terminiert: "Terminiert",
  erledigt: "Erledigt",
  storniert: "Storniert",
};

async function ladeAnlage(id: string) {
  const [zeile] = await getDb()
    .select({
      anlage: installation,
      kundeId: customer.id,
      kundeName: customer.name,
      kundennummer: customer.kundennummer,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(eq(installation.id, id))
    .limit(1);

  return zeile;
}

async function ladeAuftraege(anlageId: string) {
  return getDb()
    .select({
      id: maintenanceJob.id,
      faelligAm: maintenanceJob.faelligAm,
      terminAm: maintenanceJob.terminAm,
      status: maintenanceJob.status,
    })
    .from(maintenanceJob)
    .where(eq(maintenanceJob.installationId, anlageId))
    .orderBy(desc(maintenanceJob.faelligAm))
    .limit(10);
}

async function ladeProtokolle(anlageId: string) {
  return getDb()
    .select({
      id: serviceReport.id,
      durchgefuehrtAm: serviceReport.durchgefuehrtAm,
      taetigkeiten: serviceReport.taetigkeiten,
      maengel: serviceReport.maengel,
    })
    .from(serviceReport)
    .where(eq(serviceReport.installationId, anlageId))
    .orderBy(desc(serviceReport.durchgefuehrtAm))
    .limit(10);
}

export default async function AnlageDetailPage({ params }: PageProps<"/anlagen/[id]">) {
  const { id } = await params;
  const zeile = await ladeAnlage(id);

  if (!zeile) notFound();

  const { anlage } = zeile;
  const [auftraege, protokolle] = await Promise.all([ladeAuftraege(id), ladeProtokolle(id)]);

  const stammdaten: Array<[string, string]> = [
    ["Hersteller", anlage.hersteller ?? "–"],
    ["Modell", anlage.modell ?? "–"],
    ["Serien-Nr.", anlage.serienNr ?? "–"],
    ["Baujahr", anlage.baujahr ? String(anlage.baujahr) : "–"],
    ["Standort", anlage.standort ?? "–"],
    ["Adresse", [anlage.strasse, anlage.plz, anlage.ort].filter(Boolean).join(", ") || "–"],
  ];

  const wartung: Array<[string, string]> = [
    ["Intervall", `${anlage.wartungsintervallMonate} Monate`],
    ["Letzte Wartung", anlage.letzteWartungAm ? dateFmt.format(anlage.letzteWartungAm) : "–"],
    ["Nächste Wartung", anlage.naechsteWartungAm ? dateFmt.format(anlage.naechsteWartungAm) : "–"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1">
            {!anlage.aktiv ? (
              <Badge variant="outline">Inaktiv</Badge>
            ) : (
              <Badge variant="secondary">Aktiv</Badge>
            )}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{anlage.bezeichnung}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <Link href={`/kunden/${zeile.kundeId}`} className="underline-offset-4 hover:underline">
              {zeile.kundeName}
            </Link>{" "}
            · {zeile.kundennummer}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/anlagen/${anlage.id}/bearbeiten`}>Bearbeiten</Link>
          </Button>
          <Button asChild>
            <Link href={`/anlagen/${anlage.id}/qr`}>
              <QrCode />
              QR-Aufkleber
            </Link>
          </Button>
          <ActionButton
            action={setAnlageAktiv.bind(null, anlage.id, !anlage.aktiv)}
            label={anlage.aktiv ? "Deaktivieren" : "Aktivieren"}
            confirm={
              anlage.aktiv
                ? "Anlage deaktivieren? Sie fällt damit aus dem Wartungsturnus."
                : undefined
            }
          />
        </div>
      </div>

      {!anlage.aktiv ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Diese Anlage ist deaktiviert und wird vom täglichen Wartungs-Scan übersprungen.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stammdaten</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              {stammdaten.map(([label, wert]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{wert}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wartung</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
              {wartung.map(([label, wert]) => (
                <div key={label} className="contents">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{wert}</dd>
                </div>
              ))}
              <dt className="text-muted-foreground">QR-Token</dt>
              <dd className="text-right font-mono text-[13px]">{anlage.qrToken}</dd>
            </dl>
            <p className="text-muted-foreground mt-4 border-t pt-4 text-xs leading-relaxed">
              Der Monteur erreicht die Anlage unter <code>/anlage/{anlage.qrToken}</code> – per
              Scan oder durch Eintippen des Tokens unter <code>/scan</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Wartungsaufträge</h2>
        {auftraege.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Noch keine Aufträge. Der tägliche Scan legt sie an, sobald die nächste Wartung
                innerhalb des Vorlaufs liegt.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fällig</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auftraege.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">{dateFmt.format(a.faelligAm)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {a.terminAm ? dateFmt.format(a.terminAm) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Protokolle</h2>
        {protokolle.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Noch keine Serviceprotokolle erfasst.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Durchgeführt</TableHead>
                  <TableHead>Tätigkeiten</TableHead>
                  <TableHead>Mängel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protokolle.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      {dateFmt.format(p.durchgefuehrtAm)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">
                      {p.taetigkeiten ?? "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-normal">
                      {p.maengel ?? "–"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
