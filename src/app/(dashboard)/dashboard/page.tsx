import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, CalendarClock, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customer, getDb, installation, maintenanceJob, user } from "@/lib/db";

export const metadata: Metadata = { title: "Übersicht" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

const STATUS_VARIANT = {
  ueberfaellig: "destructive",
  geplant: "secondary",
  terminiert: "outline",
} as const;

const STATUS_LABEL: Record<string, string> = {
  ueberfaellig: "Überfällig",
  geplant: "Geplant",
  terminiert: "Terminiert",
};

function relativerAbstand(faelligAm: Date, jetzt: number): string {
  const tage = Math.round((faelligAm.getTime() - jetzt) / 86_400_000);
  if (tage < 0) return tage === -1 ? "seit gestern" : `seit ${-tage} Tagen`;
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  return `in ${tage} Tagen`;
}

const FILTER = [
  { wert: "alle", label: "Alle" },
  { wert: "geplant", label: "Geplant" },
  { wert: "terminiert", label: "Terminiert" },
  { wert: "ueberfaellig", label: "Überfällig" },
] as const;

/** Offene Wartungsaufträge, die der Cron-Lauf angelegt hat. */
async function ladeOffeneAuftraege() {
  return getDb()
    .select({
      id: maintenanceJob.id,
      faelligAm: maintenanceJob.faelligAm,
      terminAm: maintenanceJob.terminAm,
      status: maintenanceJob.status,
      anlage: installation.bezeichnung,
      kunde: customer.name,
      monteur: user.name,
    })
    .from(maintenanceJob)
    .innerJoin(installation, eq(installation.id, maintenanceJob.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .leftJoin(user, eq(user.id, maintenanceJob.monteurId))
    .where(inArray(maintenanceJob.status, ["geplant", "terminiert", "ueberfaellig"]))
    .orderBy(asc(maintenanceJob.faelligAm))
    .limit(50);
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { status } = await searchParams;
  const filter = typeof status === "string" && status !== "alle" ? status : "alle";

  let auftraege: Awaited<ReturnType<typeof ladeOffeneAuftraege>> = [];
  let fehler: string | null = null;

  try {
    auftraege = await ladeOffeneAuftraege();
  } catch (error) {
    // Ohne konfigurierte Datenbank soll die Seite trotzdem rendern.
    fehler = error instanceof Error ? error.message : String(error);
  }

  const gefiltert = filter === "alle" ? auftraege : auftraege.filter((a) => a.status === filter);

  const jetzt = new Date().getTime();
  const ueberfaellig = auftraege.filter((a) => a.status === "ueberfaellig").length;
  const baldFaellig = auftraege.filter(
    (a) =>
      a.status !== "ueberfaellig" &&
      a.faelligAm.getTime() - jetzt <= 30 * 86_400_000,
  ).length;

  const kennzahlen = [
    {
      label: "Überfällig",
      wert: ueberfaellig,
      icon: AlertTriangle,
      iconKlasse: "bg-destructive/10 text-destructive",
    },
    {
      label: "Fällig in 30 Tagen",
      wert: baldFaellig,
      icon: CalendarClock,
      iconKlasse: "bg-primary/10 text-primary",
    },
    {
      label: "Offen gesamt",
      wert: auftraege.length,
      icon: ClipboardList,
      iconKlasse: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Offene Wartungen</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Automatisch erzeugt vom täglichen Wartungs-Scan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {kennzahlen.map(({ label, wert, icon: Icon, iconKlasse }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-center gap-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconKlasse}`}>
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-2xl font-semibold tracking-tight tabular-nums">
                  {fehler ? "–" : wert}
                </span>
                <span className="text-muted-foreground block text-[13px]">{label}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER.map(({ wert, label }) =>
          filter === wert ? (
            <Button key={wert} variant="default" size="sm" disabled>
              {label}
            </Button>
          ) : (
            <Button key={wert} variant="outline" size="sm" asChild>
              <Link href={wert === "alle" ? "/dashboard" : `/dashboard?status=${wert}`}>
                {label}
              </Link>
            </Button>
          ),
        )}
      </div>

      {fehler ? (
        <Card size="sm">
          <CardContent>
            <p className="text-destructive text-sm">Datenbank nicht erreichbar: {fehler}</p>
          </CardContent>
        </Card>
      ) : gefiltert.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {auftraege.length === 0
                ? "Aktuell keine offenen Wartungsaufträge. Sobald der tägliche Scan fällige Anlagen findet, erscheinen sie hier."
                : "Kein Auftrag mit diesem Status. Filter oben zurücksetzen, um alle zu sehen."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 overflow-x-auto py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fällig</TableHead>
                <TableHead>Kunde</TableHead>
                <TableHead>Anlage</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Monteur</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gefiltert.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{dateFmt.format(a.faelligAm)}</span>{" "}
                    <span className="text-muted-foreground text-xs">
                      {relativerAbstand(a.faelligAm, jetzt)}
                    </span>
                  </TableCell>
                  <TableCell>{a.kunde}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/${a.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {a.anlage}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {a.terminAm ? dateFmt.format(a.terminAm) : "–"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.monteur ?? "–"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        STATUS_VARIANT[a.status as keyof typeof STATUS_VARIANT] ?? "secondary"
                      }
                    >
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
  );
}
