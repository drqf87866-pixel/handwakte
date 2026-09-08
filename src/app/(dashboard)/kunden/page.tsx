import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { Plus } from "lucide-react";

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

export const metadata: Metadata = { title: "Kunden" };
export const dynamic = "force-dynamic";

async function ladeKunden() {
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
    .groupBy(customer.id)
    .orderBy(asc(customer.name));
}

export default async function KundenPage() {
  let kunden: Awaited<ReturnType<typeof ladeKunden>> = [];
  let fehler: string | null = null;

  try {
    kunden = await ladeKunden();
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
            {!fehler && kunden.length > 0 ? (
              <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums">
                {kunden.length}
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
              Noch keine Kunden angelegt. Legen Sie den ersten Kunden an, um Anlagen zu
              verwalten.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kundennummer</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Ansprechpartner</TableHead>
                <TableHead>Ort</TableHead>
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
                  <TableCell className="font-medium">
                    <Link href={`/kunden/${k.id}`} className="underline-offset-4 hover:underline">
                      {k.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {k.ansprechpartner ?? "–"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{k.ort ?? "–"}</TableCell>
                  <TableCell className="text-right tabular-nums">{k.anlagen}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
