import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { customer, getDb, installation } from "@/lib/db";

export const metadata: Metadata = { title: "QR-Aufkleber" };
export const dynamic = "force-dynamic";

async function ladeAnlage(id: string) {
  const [zeile] = await getDb()
    .select({
      bezeichnung: installation.bezeichnung,
      standort: installation.standort,
      qrToken: installation.qrToken,
      kunde: customer.name,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(eq(installation.id, id))
    .limit(1);

  return zeile;
}

export default async function QrAufkleberPage({ params }: PageProps<"/anlagen/[id]/qr">) {
  const { id } = await params;
  const anlage = await ladeAnlage(id);

  if (!anlage) notFound();

  // BETTER_AUTH_URL ist bereits die kanonische App-URL und steht in .env wie
  // .dev.vars - keine zusaetzliche Variable noetig.
  const basis = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const ziel = `${basis.replace(/\/$/, "")}/anlage/${anlage.qrToken}`;

  // Nur toString() verwenden: toFile() zoege node:fs ins Worker-Bundle.
  // Fehlerkorrektur M reicht fuer einen Aufkleber im Heizungskeller und haelt
  // den Code grob genug fuer schlechte Handykameras.
  const svg = await QRCode.toString(ziel, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
  });

  return (
    <div className="space-y-6">
      {/* Beim Drucken bleibt nur der Aufkleber stehen - Navigation, Header und
          die Buttons dieser Seite verschwinden. */}
      <style>{`
        @media print {
          body { background: #fff; }
          nav, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .aufkleber { border: 1px dashed #999; break-inside: avoid; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QR-Aufkleber</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ausdrucken, laminieren und gut sichtbar an der Anlage anbringen.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/anlagen/${id}`}>Zurück zur Anlage</Link>
        </Button>
      </div>

      <div className="aufkleber w-[85mm] rounded-2xl border bg-white p-4 text-black shadow-xs">
        <div className="flex gap-4">
          <div
            className="size-[38mm] shrink-0 [&>svg]:size-full"
            // Eingabe ist die selbst gebaute URL, kein Nutzerinhalt.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-tight font-semibold">{anlage.bezeichnung}</p>
            <p className="text-xs">{anlage.kunde}</p>
            {anlage.standort ? <p className="text-xs">{anlage.standort}</p> : null}
            <p className="pt-2 font-mono text-xs tracking-wider">{anlage.qrToken}</p>
          </div>
        </div>
        <p className="mt-3 border-t pt-2 text-[10px] leading-tight">
          Scannen oder Code unter {basis.replace(/^https?:\/\//, "")}/scan eingeben.
        </p>
      </div>

      <p className="text-muted-foreground no-print text-sm">
        Ziel des Codes: <code>{ziel}</code>
      </p>
    </div>
  );
}
