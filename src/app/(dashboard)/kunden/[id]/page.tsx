import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

import { deleteKunde } from "@/app/(dashboard)/kunden/actions";
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
import { customer, getDb, installation } from "@/lib/db";

export const metadata: Metadata = { title: "Kunde" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

async function ladeKunde(id: string) {
  const [zeile] = await getDb().select().from(customer).where(eq(customer.id, id)).limit(1);
  return zeile;
}

async function ladeAnlagen(kundeId: string) {
  return getDb()
    .select({
      id: installation.id,
      bezeichnung: installation.bezeichnung,
      standort: installation.standort,
      naechsteWartungAm: installation.naechsteWartungAm,
      aktiv: installation.aktiv,
    })
    .from(installation)
    .where(eq(installation.customerId, kundeId))
    .orderBy(asc(installation.bezeichnung));
}

export default async function KundeDetailPage({ params }: PageProps<"/kunden/[id]">) {
  const { id } = await params;
  const kunde = await ladeKunde(id);

  if (!kunde) notFound();

  const anlagen = await ladeAnlagen(id);

  const stammdaten: Array<[string, string]> = [
    ["Kundennummer", kunde.kundennummer],
    ["Ansprechpartner", kunde.ansprechpartner ?? "–"],
    ["E-Mail", kunde.email ?? "–"],
    ["Telefon", kunde.telefon ?? "–"],
    ["Straße", kunde.strasse ?? "–"],
    ["PLZ / Ort", [kunde.plz, kunde.ort].filter(Boolean).join(" ") || "–"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{kunde.name}</h1>
          <p className="text-muted-foreground mt-1 font-mono text-[13px]">
            {kunde.kundennummer}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/kunden/${kunde.id}/bearbeiten`}>Bearbeiten</Link>
          </Button>
          <Button asChild>
            <Link href={`/anlagen/neu?kunde=${kunde.id}`}>
              <Plus />
              Anlage anlegen
            </Link>
          </Button>
          <ActionButton
            action={deleteKunde.bind(null, kunde.id)}
            label="Löschen"
            variant="destructive"
            confirm={`Kunde "${kunde.name}" wirklich löschen?`}
            pendingLabel="Löscht …"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {stammdaten.map(([label, wert]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-2.5 sm:contents sm:border-0 sm:pb-0"
              >
                <dt className="text-muted-foreground shrink-0">{label}</dt>
                <dd className="text-right sm:text-left">{wert}</dd>
              </div>
            ))}
          </dl>
          {kunde.notizen ? (
            <p className="text-muted-foreground mt-4 border-t pt-4 text-sm whitespace-pre-wrap">
              {kunde.notizen}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">
          Anlagen{" "}
          {anlagen.length > 0 ? (
            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {anlagen.length}
            </span>
          ) : null}
        </h2>
        {anlagen.length === 0 ? (
          <Card size="sm">
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Noch keine Anlagen für diesen Kunden.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="gap-0 py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="hidden sm:table-cell">Standort</TableHead>
                  <TableHead>Nächste Wartung</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anlagen.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="min-w-0 font-medium">
                      <Link href={`/anlagen/${a.id}`} className="break-words underline-offset-4 hover:underline">
                        {a.bezeichnung}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden max-w-44 truncate sm:table-cell">{a.standort ?? "–"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {a.naechsteWartungAm ? dateFmt.format(a.naechsteWartungAm) : "–"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={a.aktiv ? "secondary" : "outline"}>
                        {a.aktiv ? "Aktiv" : "Inaktiv"}
                      </Badge>
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
