import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq, ilike, or } from "drizzle-orm";
import { Plus } from "lucide-react";

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
import { customer, getDb, installation } from "@/lib/db";

export const metadata: Metadata = { title: "Anlagen" };
export const dynamic = "force-dynamic";

const SEITENGROESSE = 20;

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/** Sucht in Bezeichnung, Kundenname, Standort und Ort. */
function suchBedingung(q: string) {
  const muster = `%${q}%`;
  return or(
    ilike(installation.bezeichnung, muster),
    ilike(customer.name, muster),
    ilike(installation.standort, muster),
    ilike(installation.ort, muster),
  );
}

async function ladeAnlagen(q: string, offset: number) {
  return getDb()
    .select({
      id: installation.id,
      bezeichnung: installation.bezeichnung,
      standort: installation.standort,
      wartungsintervallMonate: installation.wartungsintervallMonate,
      naechsteWartungAm: installation.naechsteWartungAm,
      aktiv: installation.aktiv,
      kunde: customer.name,
      kundeId: customer.id,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(q ? suchBedingung(q) : undefined)
    .orderBy(asc(customer.name), asc(installation.bezeichnung))
    .limit(SEITENGROESSE)
    .offset(offset);
}

async function zaehleAnlagen(q: string) {
  const [zeile] = await getDb()
    .select({ anzahl: count() })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(q ? suchBedingung(q) : undefined);
  return zeile?.anzahl ?? 0;
}

function seitenHref(q: string, seite: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (seite > 1) params.set("seite", String(seite));
  const query = params.toString();
  return query ? `/anlagen?${query}` : "/anlagen";
}

export default async function AnlagenPage({ searchParams }: PageProps<"/anlagen">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const gewuenscht =
    typeof params.seite === "string" ? Number.parseInt(params.seite, 10) : 1;

  const jetzt = new Date();

  let anlagen: Awaited<ReturnType<typeof ladeAnlagen>> = [];
  let gesamt = 0;
  let seite = 1;
  let seiten = 1;
  let fehler: string | null = null;

  try {
    gesamt = await zaehleAnlagen(q);
    seiten = Math.max(1, Math.ceil(gesamt / SEITENGROESSE));
    seite = Number.isInteger(gewuenscht) && gewuenscht > 0 ? Math.min(gewuenscht, seiten) : 1;
    anlagen = await ladeAnlagen(q, (seite - 1) * SEITENGROESSE);
  } catch (error) {
    fehler = error instanceof Error ? error.message : String(error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            Anlagen
            {!fehler && gesamt > 0 ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
                {gesamt}
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Die digitale Bauakte je Heizungs- oder Sanitäranlage.
          </p>
        </div>
        <Button asChild>
          <Link href="/anlagen/neu">
            <Plus />
            Neue Anlage
          </Link>
        </Button>
      </div>

      <form method="get" action="/anlagen" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Anlage, Kunde oder Standort suchen …"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Suchen
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/anlagen">Zurücksetzen</Link>
          </Button>
        ) : null}
      </form>

      {fehler ? (
        <Card size="sm">
          <CardContent>
            <p className="text-destructive text-sm">Datenbank nicht erreichbar: {fehler}</p>
          </CardContent>
        </Card>
      ) : anlagen.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {q
                ? `Keine Anlagen für „${q}" gefunden. Suche anpassen oder zurücksetzen.`
                : "Noch keine Anlagen angelegt. Legen Sie die erste Anlage an, damit der Wartungs-Scan sie erfassen kann."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kunde</TableHead>
                  <TableHead>Anlage</TableHead>
                  <TableHead className="hidden md:table-cell">Standort</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Intervall</TableHead>
                  <TableHead>Nächste Wartung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anlagen.map((a) => {
                  const ueberfaellig =
                    a.aktiv && a.naechsteWartungAm !== null && a.naechsteWartungAm < jetzt;

                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground min-w-0">
                        <Link
                          href={`/kunden/${a.kundeId}`}
                          className="break-words underline-offset-4 hover:underline"
                        >
                          {a.kunde}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-0 font-medium">
                        <Link href={`/anlagen/${a.id}`} className="break-words underline-offset-4 hover:underline">
                          {a.bezeichnung}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden max-w-44 truncate md:table-cell">{a.standort ?? "–"}</TableCell>
                      <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
                        {a.wartungsintervallMonate} Mon.
                      </TableCell>
                      <TableCell
                        className={
                          ueberfaellig
                            ? "text-destructive font-medium whitespace-nowrap"
                            : "whitespace-nowrap"
                        }
                      >
                        {a.naechsteWartungAm ? dateFmt.format(a.naechsteWartungAm) : "–"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {!a.aktiv ? (
                          <Badge variant="outline">Inaktiv</Badge>
                        ) : ueberfaellig ? (
                          <Badge variant="destructive">Überfällig</Badge>
                        ) : (
                          <Badge variant="secondary">Aktiv</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          {seiten > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm tabular-nums">
                Seite {seite} von {seiten} · {gesamt} Anlagen
              </p>
              <div className="flex gap-2">
                {seite > 1 ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={seitenHref(q, seite - 1)}>Zurück</Link>
                  </Button>
                ) : null}
                {seite < seiten ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={seitenHref(q, seite + 1)}>Weiter</Link>
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
