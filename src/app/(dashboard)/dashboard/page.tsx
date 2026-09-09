import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, gte, ilike, inArray, lte, or } from "drizzle-orm";
import { AlertTriangle, CalendarClock, ClipboardList } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { customer, getDb, installation, maintenanceJob, user } from "@/lib/db";
import { berlinTagesEnde, berlinTagesStart, berlinWochenEnde } from "@/lib/dates";

export const metadata: Metadata = { title: "Übersicht" };
export const dynamic = "force-dynamic";

const SEITENGROESSE = 20;

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
  { wert: "erledigt", label: "Erledigt" },
  { wert: "storniert", label: "Storniert" },
] as const;

const ZEITRAUM = [
  { wert: "alle", label: "Alle" },
  { wert: "heute", label: "Heute" },
  { wert: "woche", label: "Diese Woche" },
] as const;

const OFFENE_STATUS = ["geplant", "terminiert", "ueberfaellig"] as const;
type AlleStatus = "geplant" | "terminiert" | "ueberfaellig" | "erledigt" | "storniert";

/**
 * Status-, Zeitraum- und Suchfilter als DB-Bedingung.
 *
 * "Alle" beim Status meint alle offenen Auftraege; erledigt/storniert sind
 * als Historie einzeln waehlbar. Zeitraum "heute" zeigt alles, was heute
 * dran ist (faellig bis Tagesende oder Termin heute), "woche" dasselbe bis
 * Sonntag. Grenzen in Europe/Berlin, passend zur Anzeige.
 */
function filterBedingung(filter: string, zeitraum: string, q: string) {
  const bedingungen = [
    filter === "alle"
      ? inArray(maintenanceJob.status, [...OFFENE_STATUS])
      : eq(maintenanceJob.status, filter as AlleStatus),
  ];

  if (zeitraum === "heute" || zeitraum === "woche") {
    const start = berlinTagesStart();
    const ende = zeitraum === "heute" ? berlinTagesEnde() : berlinWochenEnde();
    bedingungen.push(
      or(
        lte(maintenanceJob.faelligAm, ende),
        and(gte(maintenanceJob.terminAm, start), lte(maintenanceJob.terminAm, ende)),
      )!,
    );
  }

  if (q) {
    const muster = `%${q}%`;
    const treffer = or(ilike(customer.name, muster), ilike(installation.bezeichnung, muster));
    if (treffer) bedingungen.push(treffer);
  }
  return and(...bedingungen);
}

/** Wartungsaufträge des gewaehlten Filters (eine Seite). */
async function ladeAuftraege(filter: string, zeitraum: string, q: string, offset: number) {
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
    .where(filterBedingung(filter, zeitraum, q))
    .orderBy(asc(maintenanceJob.faelligAm))
    .limit(SEITENGROESSE)
    .offset(offset);
}

async function zaehleAuftraege(filter: string, zeitraum: string, q: string) {
  const [zeile] = await getDb()
    .select({ anzahl: count() })
    .from(maintenanceJob)
    .innerJoin(installation, eq(installation.id, maintenanceJob.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(filterBedingung(filter, zeitraum, q));
  return zeile?.anzahl ?? 0;
}

/**
 * Kennzahlen ueber alle offenen Auftraege (nicht nur die aktuelle Seite),
 * damit sie bei Suche und Pagination nicht luegen.
 */
async function ladeKennzahlen() {
  const grenze = new Date(Date.now() + 30 * 86_400_000);
  const [offen, ueberfaellig, bald] = await Promise.all([
    getDb()
      .select({ anzahl: count() })
      .from(maintenanceJob)
      .where(inArray(maintenanceJob.status, [...OFFENE_STATUS])),
    getDb()
      .select({ anzahl: count() })
      .from(maintenanceJob)
      .where(eq(maintenanceJob.status, "ueberfaellig")),
    getDb()
      .select({ anzahl: count() })
      .from(maintenanceJob)
      .where(
        and(
          inArray(maintenanceJob.status, ["geplant", "terminiert"]),
          lte(maintenanceJob.faelligAm, grenze),
        ),
      ),
  ]);
  return {
    offen: offen[0]?.anzahl ?? 0,
    ueberfaellig: ueberfaellig[0]?.anzahl ?? 0,
    baldFaellig: bald[0]?.anzahl ?? 0,
  };
}

function dashboardHref(filter: string, zeitraum: string, q: string, seite: number) {
  const params = new URLSearchParams();
  if (filter !== "alle") params.set("status", filter);
  if (zeitraum !== "alle") params.set("zeitraum", zeitraum);
  if (q) params.set("q", q);
  if (seite > 1) params.set("seite", String(seite));
  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const rohStatus = typeof params.status === "string" ? params.status : "alle";
  const filter = FILTER.some((f) => f.wert === rohStatus) ? rohStatus : "alle";
  const rohZeitraum = typeof params.zeitraum === "string" ? params.zeitraum : "alle";
  const zeitraum = ZEITRAUM.some((z) => z.wert === rohZeitraum) ? rohZeitraum : "alle";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const gewuenscht =
    typeof params.seite === "string" ? Number.parseInt(params.seite, 10) : 1;

  let auftraege: Awaited<ReturnType<typeof ladeAuftraege>> = [];
  let gesamt = 0;
  let seite = 1;
  let seiten = 1;
  let kennzahlenWerte = { offen: 0, ueberfaellig: 0, baldFaellig: 0 };
  let fehler: string | null = null;

  try {
    [gesamt, kennzahlenWerte] = await Promise.all([
      zaehleAuftraege(filter, zeitraum, q),
      ladeKennzahlen(),
    ]);
    seiten = Math.max(1, Math.ceil(gesamt / SEITENGROESSE));
    seite = Number.isInteger(gewuenscht) && gewuenscht > 0 ? Math.min(gewuenscht, seiten) : 1;
    auftraege = await ladeAuftraege(filter, zeitraum, q, (seite - 1) * SEITENGROESSE);
  } catch (error) {
    // Ohne konfigurierte Datenbank soll die Seite trotzdem rendern.
    fehler = error instanceof Error ? error.message : String(error);
  }

  const jetzt = new Date().getTime();

  const kennzahlen = [
    {
      label: "Überfällig",
      wert: kennzahlenWerte.ueberfaellig,
      icon: AlertTriangle,
      iconKlasse: "bg-destructive/10 text-destructive",
    },
    {
      label: "Fällig in 30 Tagen",
      wert: kennzahlenWerte.baldFaellig,
      icon: CalendarClock,
      iconKlasse: "bg-primary/10 text-primary",
    },
    {
      label: "Offen gesamt",
      wert: kennzahlenWerte.offen,
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

      <form method="get" action="/dashboard" className="flex flex-wrap gap-2">
        {filter !== "alle" ? <input type="hidden" name="status" value={filter} /> : null}
        {zeitraum !== "alle" ? <input type="hidden" name="zeitraum" value={zeitraum} /> : null}
        <Input
          name="q"
          defaultValue={q}
          placeholder="Kunde oder Anlage suchen …"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Suchen
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={dashboardHref(filter, zeitraum, "", 1)}>Zurücksetzen</Link>
          </Button>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTER.map(({ wert, label }) =>
          filter === wert ? (
            <Button key={wert} variant="default" size="sm" disabled>
              {label}
            </Button>
          ) : (
            <Button key={wert} variant="outline" size="sm" asChild>
              <Link href={dashboardHref(wert, zeitraum, q, 1)}>{label}</Link>
            </Button>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Zeitraum:</span>
        {ZEITRAUM.map(({ wert, label }) =>
          zeitraum === wert ? (
            <Button key={wert} variant="default" size="sm" disabled>
              {label}
            </Button>
          ) : (
            <Button key={wert} variant="outline" size="sm" asChild>
              <Link href={dashboardHref(filter, wert, q, 1)}>{label}</Link>
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
      ) : auftraege.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {gesamt === 0 && !q && filter === "alle" && zeitraum === "alle"
                ? "Aktuell keine offenen Wartungsaufträge. Sobald der tägliche Scan fällige Anlagen findet, erscheinen sie hier."
                : "Keine Aufträge für diese Auswahl. Filter, Zeitraum oder Suche zurücksetzen, um alle zu sehen."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fällig</TableHead>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Anlage</TableHead>
                  <TableHead className="hidden sm:table-cell">Termin</TableHead>
                  <TableHead className="hidden lg:table-cell">Monteur</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auftraege.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap">
                      <span className="block font-medium">{dateFmt.format(a.faelligAm)}</span>
                      <span className="text-muted-foreground block text-xs">
                        {relativerAbstand(a.faelligAm, jetzt)}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-0">{a.kunde}</TableCell>
                    <TableCell className="min-w-0">
                      <Link
                        href={`/dashboard/${a.id}`}
                        className="font-medium break-words underline-offset-4 hover:underline"
                      >
                        {a.anlage}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden whitespace-nowrap sm:table-cell">
                      {a.terminAm ? dateFmt.format(a.terminAm) : "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-32 truncate lg:table-cell">
                      {a.monteur ?? "–"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
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
          {seiten > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm tabular-nums">
                Seite {seite} von {seiten} · {gesamt} Aufträge
              </p>
              <div className="flex gap-2">
                {seite > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={dashboardHref(filter, zeitraum, q, seite - 1)}>Zurück</Link>
                  </Button>
                ) : null}
                {seite < seiten ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={dashboardHref(filter, zeitraum, q, seite + 1)}>Weiter</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
