import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { storniereAuftrag, terminAuftrag } from "@/app/(dashboard)/dashboard/actions";
import { ActionButton } from "@/components/dashboard/action-button";
import { AuftragTerminForm } from "@/components/dashboard/auftrag-termin-form";
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
import {
  customer,
  getDb,
  installation,
  maintenanceJob,
  serviceReport,
  user,
} from "@/lib/db";

export const metadata: Metadata = { title: "Auftrag" };
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

/** Status, die im Büro noch bearbeitet werden können. */
const OFFEN = ["geplant", "terminiert", "ueberfaellig"];

async function ladeAuftrag(jobId: string) {
  const [zeile] = await getDb()
    .select({
      job: maintenanceJob,
      anlageId: installation.id,
      anlage: installation.bezeichnung,
      standort: installation.standort,
      kundeId: customer.id,
      kunde: customer.name,
      monteur: user.name,
    })
    .from(maintenanceJob)
    .innerJoin(installation, eq(installation.id, maintenanceJob.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .leftJoin(user, eq(user.id, maintenanceJob.monteurId))
    .where(eq(maintenanceJob.id, jobId))
    .limit(1);

  return zeile;
}

async function ladeProtokolle(jobId: string) {
  return getDb()
    .select({
      id: serviceReport.id,
      durchgefuehrtAm: serviceReport.durchgefuehrtAm,
      taetigkeiten: serviceReport.taetigkeiten,
      maengel: serviceReport.maengel,
    })
    .from(serviceReport)
    .where(eq(serviceReport.jobId, jobId))
    .orderBy(desc(serviceReport.durchgefuehrtAm));
}

async function ladeMonteure() {
  return getDb()
    .select({ id: user.id, name: user.name })
    .from(user)
    .orderBy(asc(user.name));
}

export default async function AuftragDetailPage({ params }: PageProps<"/dashboard/[jobId]">) {
  const { jobId } = await params;
  const zeile = await ladeAuftrag(jobId);

  if (!zeile) notFound();

  const { job } = zeile;
  const offen = OFFEN.includes(job.status);
  const [protokolle, monteure] = await Promise.all([ladeProtokolle(jobId), ladeMonteure()]);

  const details: Array<[string, string]> = [
    ["Fällig", `${dateFmt.format(job.faelligAm)}`],
    ["Termin", job.terminAm ? dateFmt.format(job.terminAm) : "–"],
    ["Monteur", zeile.monteur ?? "–"],
    ["Standort", zeile.standort ?? "–"],
    ["Notiz", job.notiz ?? "–"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href="/dashboard">
            <ArrowLeft />
            Offene Wartungen
          </Link>
        </Button>
        <p className="mb-1">
          <Badge variant={STATUS_VARIANT[job.status as keyof typeof STATUS_VARIANT] ?? "secondary"}>
            {STATUS_LABEL[job.status] ?? job.status}
          </Badge>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Auftrag</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          <Link href={`/anlagen/${zeile.anlageId}`} className="underline-offset-4 hover:underline">
            {zeile.anlage}
          </Link>{" "}
          ·{" "}
          <Link href={`/kunden/${zeile.kundeId}`} className="underline-offset-4 hover:underline">
            {zeile.kunde}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            {details.map(([label, wert]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">{wert}</dd>
              </div>
            ))}
          </dl>
          {offen ? (
            <Button asChild className="mt-4 w-full sm:w-auto">
              <Link href={`/protokoll/${job.id}`}>
                <ClipboardList />
                Protokoll ausfüllen
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {offen ? (
        <div className="space-y-4">
          <AuftragTerminForm
            action={terminAuftrag.bind(null, job.id)}
            auftrag={{
              terminAm: job.terminAm,
              faelligAm: job.faelligAm,
              monteurId: job.monteurId,
              notiz: job.notiz,
            }}
            monteure={monteure}
          />
          <Card size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Auftrag gegenstandslos? Stornierte Aufträge bleiben in der Historie, zählen aber
                nicht mehr als offen.
              </p>
              <ActionButton
                action={storniereAuftrag.bind(null, job.id)}
                label="Stornieren"
                variant="destructive"
                pendingLabel="Wird storniert …"
                confirm="Auftrag wirklich stornieren?"
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {job.status === "erledigt"
                ? "Dieser Auftrag ist erledigt - das Protokoll steht unten."
                : "Dieser Auftrag wurde storniert und zählt nicht mehr als offen. Bei Bedarf legt der tägliche Scan einen neuen an."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Protokolle zu diesem Auftrag</h2>
        {protokolle.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <p className="text-muted-foreground text-sm">Noch kein Protokoll erfasst.</p>
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
