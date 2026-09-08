import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

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
import { customer, getDb, installation } from "@/lib/db";

export const metadata: Metadata = { title: "Anlagen" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

async function ladeAnlagen() {
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
    .orderBy(asc(customer.name), asc(installation.bezeichnung));
}

export default async function AnlagenPage() {
  let anlagen: Awaited<ReturnType<typeof ladeAnlagen>> = [];
  let fehler: string | null = null;

  try {
    anlagen = await ladeAnlagen();
  } catch (error) {
    fehler = error instanceof Error ? error.message : String(error);
  }

  const jetzt = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            Anlagen
            {!fehler && anlagen.length > 0 ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
                {anlagen.length}
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
              Noch keine Anlagen angelegt. Legen Sie die erste Anlage an, damit der
              Wartungs-Scan sie erfassen kann.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Anlage</TableHead>
                <TableHead>Standort</TableHead>
                <TableHead className="text-right">Intervall</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      <Link
                        href={`/kunden/${a.kundeId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {a.kunde}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/anlagen/${a.id}`} className="underline-offset-4 hover:underline">
                        {a.bezeichnung}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{a.standort ?? "–"}</TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
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
                    <TableCell>
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
      )}
    </div>
  );
}
