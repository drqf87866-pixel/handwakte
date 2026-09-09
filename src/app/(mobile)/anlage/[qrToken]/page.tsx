import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Camera, ClipboardList, FileText } from "lucide-react";

import { CameraCapture } from "@/components/mobile/camera-capture";
import { OfflineBanner } from "@/components/shared/offline-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attachment, customer, getDb, installation } from "@/lib/db";
import { objectUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

async function ladeAnlage(qrToken: string) {
  const [row] = await getDb()
    .select({
      id: installation.id,
      bezeichnung: installation.bezeichnung,
      hersteller: installation.hersteller,
      modell: installation.modell,
      serienNr: installation.serienNr,
      baujahr: installation.baujahr,
      standort: installation.standort,
      letzteWartungAm: installation.letzteWartungAm,
      naechsteWartungAm: installation.naechsteWartungAm,
      kunde: customer.name,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(eq(installation.qrToken, qrToken))
    .limit(1);

  return row;
}

async function ladeDateien(anlageId: string) {
  return getDb()
    .select({
      id: attachment.id,
      dateiname: attachment.dateiname,
      r2Key: attachment.r2Key,
      art: attachment.art,
    })
    .from(attachment)
    .where(eq(attachment.installationId, anlageId))
    .orderBy(desc(attachment.createdAt))
    .limit(20);
}

export default async function AnlagePage({ params }: PageProps<"/anlage/[qrToken]">) {
  const { qrToken } = await params;
  const anlage = await ladeAnlage(qrToken);

  if (!anlage) notFound();

  const dateien = await ladeDateien(anlage.id);

  const ueberfaellig =
    anlage.naechsteWartungAm !== null && anlage.naechsteWartungAm < new Date();

  const stammdaten: Array<[string, string]> = [
    ["Kunde", anlage.kunde],
    ["Hersteller", anlage.hersteller ?? "–"],
    ["Modell", anlage.modell ?? "–"],
    ["Serien-Nr.", anlage.serienNr ?? "–"],
    ["Baujahr", anlage.baujahr ? String(anlage.baujahr) : "–"],
    ["Standort", anlage.standort ?? "–"],
    ["Letzte Wartung", anlage.letzteWartungAm ? dateFmt.format(anlage.letzteWartungAm) : "–"],
    ["Nächste Wartung", anlage.naechsteWartungAm ? dateFmt.format(anlage.naechsteWartungAm) : "–"],
  ];

  return (
    <div className="space-y-5">
      <OfflineBanner />
      <div>
        <p className="mb-2">
          {ueberfaellig ? (
            <Badge variant="destructive">Wartung überfällig</Badge>
          ) : (
            <Badge variant="secondary">Bauakte</Badge>
          )}
        </p>
        <h1 className="text-xl font-semibold tracking-tight">{anlage.bezeichnung}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{anlage.kunde}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-sm">
            {stammdaten.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-2.5">
        <CameraCapture installationId={anlage.id} />
        <Button asChild className="w-full" size="lg">
          <Link href={`/protokoll/neu?installation=${anlage.id}`}>
            <ClipboardList />
            Protokoll ausfüllen
          </Link>
        </Button>
      </div>

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Camera className="size-3.5" />
        Fotos werden direkt der Bauakte zugeordnet.
      </p>

      {dateien.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dokumente</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm">
              {dateien.map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <a
                    href={objectUrl(d.r2Key)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                  >
                    {d.dateiname}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
