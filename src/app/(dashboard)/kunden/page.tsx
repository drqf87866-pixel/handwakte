import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq, ilike, or } from "drizzle-orm";
import { Plus } from "lucide-react";

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

export const metadata: Metadata = { title: "Kunden" };
export const dynamic = "force-dynamic";

const SEITENGROESSE = 20;

/** Sucht in Name, Kundennummer, Ansprechpartner und Ort. */
function suchBedingung(q: string) {
  const muster = `%${q}%`;
  return or(
    ilike(customer.name, muster),
    ilike(customer.kundennummer, muster),
    ilike(customer.ansprechpartner, muster),
    ilike(customer.ort, muster),
  );
}

async function ladeKunden(q: string, offset: number) {
  return getDb()
    .select({
      id: customer.id,
      kundennummer: customer.kundennummer,
      name: customer.name,
      ansprechpartner: customer.ansprechpartner,
      ort: customer.ort,
      anlagen: count(installation.id),
    })
    .from(customer)
    .leftJoin(installation, eq(installation.customerId, customer.id))
    .where(q ? suchBedingung(q) : undefined)
    .groupBy(customer.id)
    .orderBy(asc(customer.name))
    .limit(SEITENGROESSE)
    .offset(offset);
}

async function zaehleKunden(q: string) {
  const [zeile] = await getDb()
    .select({ anzahl: count() })
    .from(customer)
    .where(q ? suchBedingung(q) : undefined);
  return zeile?.anzahl ?? 0;
}

function seitenHref(q: string, seite: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (seite > 1) params.set("seite", String(seite));
  const query = params.toString();
  return query ? `/kunden?${query}` : "/kunden";
}

export default async function KundenPage({ searchParams }: PageProps<"/kunden">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const gewuenscht =
    typeof params.seite === "string" ? Number.parseInt(params.seite, 10) : 1;

  let kunden: Awaited<ReturnType<typeof ladeKunden>> = [];
  let gesamt = 0;
  let seite = 1;
  let seiten = 1;
  let fehler: string | null = null;

  try {
    gesamt = await zaehleKunden(q);
    seiten = Math.max(1, Math.ceil(gesamt / SEITENGROESSE));
    seite = Number.isInteger(gewuenscht) && gewuenscht > 0 ? Math.min(gewuenscht, seiten) : 1;
    kunden = await ladeKunden(q, (seite - 1) * SEITENGROESSE);
  } catch (error) {
    // Ohne konfigurierte Datenbank soll die Seite trotzdem rendern.
    fehler = error instanceof Error ? error.message : String(error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            Kunden
            {!fehler && gesamt > 0 ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
                {gesamt}
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hausverwaltungen, Eigentümer und Gewerbe mit ihren Anlagen.
          </p>
        </div>
        <Button asChild>
          <Link href="/kunden/neu">
            <Plus />
            Neuer Kunde
          </Link>
        </Button>
      </div>

      <form method="get" action="/kunden" className="flex flex-wrap gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Name, Nummer oder Ort suchen …"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Suchen
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/kunden">Zurücksetzen</Link>
          </Button>
        ) : null}
      </form>

      {fehler ? (
        <Card size="sm">
          <CardContent>
            <p className="text-destructive text-sm">Datenbank nicht erreichbar: {fehler}</p>
          </CardContent>
        </Card>
      ) : kunden.length === 0 ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {q
                ? `Keine Kunden für „${q}" gefunden. Suche anpassen oder zurücksetzen.`
                : "Noch keine Kunden angelegt. Legen Sie den ersten Kunden an, um Anlagen zu verwalten."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kundennummer</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Ansprechpartner</TableHead>
                  <TableHead className="hidden md:table-cell">Ort</TableHead>
                  <TableHead className="text-right">Anlagen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kunden.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/kunden/${k.id}`}
                        className="bg-muted rounded-md px-1.5 py-0.5 font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {k.kundennummer}
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-0 font-medium">
                      <Link href={`/kunden/${k.id}`} className="break-words underline-offset-4 hover:underline">
                        {k.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-44 truncate md:table-cell">
                      {k.ansprechpartner ?? "–"}
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-36 truncate md:table-cell">{k.ort ?? "–"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">{k.anlagen}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {seiten > 1 ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm tabular-nums">
                Seite {seite} von {seiten} · {gesamt} Kunden
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
