import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download } from "lucide-react";

import { DruckButton } from "@/app/(dashboard)/protokolle/[id]/druck-button";
import { protokollPdfSenden } from "@/app/(dashboard)/protokolle/actions";
import { ActionButton } from "@/components/dashboard/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  attachment,
  customer,
  getDb,
  installation,
  serviceReport,
  user,
} from "@/lib/db";
import { objectUrl } from "@/lib/r2";

export const metadata: Metadata = { title: "Serviceprotokoll" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const ART_LABEL: Record<string, string> = {
  foto: "Foto",
  pdf: "PDF",
  signatur: "Signatur",
  sonstiges: "Datei",
};

async function ladeProtokoll(id: string) {
  const [zeile] = await getDb()
    .select({
      report: serviceReport,
      anlageId: installation.id,
      anlage: installation.bezeichnung,
      kundeId: customer.id,
      kunde: customer.name,
      kundeEmail: customer.email,
      monteur: user.name,
    })
    .from(serviceReport)
    .innerJoin(installation, eq(installation.id, serviceReport.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .leftJoin(user, eq(user.id, serviceReport.monteurId))
    .where(eq(serviceReport.id, id))
    .limit(1);

  return zeile;
}

async function ladeDateien(reportId: string) {
  return getDb()
    .select({
      id: attachment.id,
      dateiname: attachment.dateiname,
      r2Key: attachment.r2Key,
      art: attachment.art,
      contentType: attachment.contentType,
    })
    .from(attachment)
    .where(eq(attachment.reportId, reportId))
    .orderBy(desc(attachment.createdAt));
}

export default async function ProtokollDetailPage({ params }: PageProps<"/protokolle/[id]">) {
  const { id } = await params;
  const zeile = await ladeProtokoll(id);

  if (!zeile) notFound();

  const { report } = zeile;
  const dateien = await ladeDateien(id);
  const fotos = dateien.filter((d) => d.art === "foto");
  const signatur = dateien.find((d) => d.art === "signatur");
  const sonstige = dateien.filter((d) => d.art !== "foto" && d.art !== "signatur");

  const messwerte = (report.messwerte ?? {}) as Record<string, string | number | null>;
  const messwerteZeilen: Array<[string, string]> = [
    ["Abgastemperatur", messwerte.abgastemperatur != null ? `${messwerte.abgastemperatur} °C` : "–"],
    ["CO₂", messwerte.co2 != null ? `${messwerte.co2} %` : "–"],
    ["Druck", messwerte.druck != null ? `${messwerte.druck} bar` : "–"],
    ["Arbeitszeit", report.arbeitszeitMinuten != null ? `${report.arbeitszeitMinuten} min` : "–"],
  ];

  const berichte: Array<[string, string | null]> = [
    ["Durchgeführte Tätigkeiten", report.taetigkeiten],
    ["Festgestellte Mängel", report.maengel],
    ["Empfehlungen", report.empfehlungen],
  ];

  return (
    <div className="space-y-6">
      {/* Beim Drucken bleibt nur das Protokoll-Blatt stehen - Navigation,
          Header und Buttons verschwinden. */}
      <style>{`
        @media print {
          body { background: #fff; }
          nav, header, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .druck-block { break-inside: avoid; box-shadow: none !important; }
          .druck-bild { max-height: 90mm; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1">
            <Badge variant="secondary">Serviceprotokoll</Badge>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{zeile.anlage}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <Link href={`/kunden/${zeile.kundeId}`} className="underline-offset-4 hover:underline">
              {zeile.kunde}
            </Link>{" "}
            · {dateTimeFmt.format(report.durchgefuehrtAm)}
            {zeile.monteur ? ` · ${zeile.monteur}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DruckButton />
          <Button variant="outline" asChild>
            <a href={`/api/protokolle/${report.id}/pdf`} download>
              <Download />
              PDF herunterladen
            </a>
          </Button>
          {/* Ohne Kunden-E-Mail keine Rueckfrage - die Action meldet dann,
              dass keine Adresse hinterlegt ist. */}
          <ActionButton
            action={protokollPdfSenden.bind(null, report.id)}
            label="Als PDF an Kunden senden"
            pendingLabel="Wird gesendet..."
            confirm={
              zeile.kundeEmail?.trim()
                ? `Protokoll als PDF an ${zeile.kundeEmail.trim()} senden?`
                : undefined
            }
          />
          <Button variant="outline" asChild>
            <Link href={`/anlagen/${zeile.anlageId}`}>Zur Anlage</Link>
          </Button>
          {report.jobId ? (
            <Button variant="outline" asChild>
              <Link href={`/dashboard/${report.jobId}`}>Zum Auftrag</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Druckkopf: auf dem Bildschirm unsichtbar, nur auf dem Blatt. */}
      <div className="hidden print:block">
        <p className="text-xl font-semibold">
          Serviceprotokoll – {zeile.anlage} ({zeile.kunde})
        </p>
        <p className="text-sm">
          Durchgeführt am {dateTimeFmt.format(report.durchgefuehrtAm)}
          {zeile.monteur ? ` · Monteur: ${zeile.monteur}` : ""}
        </p>
      </div>

      <Card className="druck-block">
        <CardHeader>
          <CardTitle className="text-base">Messwerte</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            {messwerteZeilen.map(([label, wert]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right tabular-nums">{wert}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="druck-block">
        <CardHeader>
          <CardTitle className="text-base">Tätigkeiten, Mängel und Empfehlungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {berichte.map(([label, wert]) => (
            <div key={label}>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {label}
              </p>
              <p className="mt-1 text-sm break-words whitespace-pre-line">
                {wert?.trim() ? wert : "–"}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {fotos.length > 0 ? (
        <Card className="druck-block">
          <CardHeader>
            <CardTitle className="text-base">Fotos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {fotos.map((f) => (
                <a key={f.id} href={objectUrl(f.r2Key)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={objectUrl(f.r2Key)}
                    alt={f.dateiname}
                    loading="lazy"
                    className="druck-bild aspect-[4/3] w-full rounded-xl border object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {sonstige.length > 0 ? (
        <Card className="druck-block">
          <CardHeader>
            <CardTitle className="text-base">Dateien</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {sonstige.map((d) => (
                <li key={d.id}>
                  <a
                    href={objectUrl(d.r2Key)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-4 hover:underline"
                  >
                    {d.dateiname}
                  </a>{" "}
                  <span className="text-muted-foreground">
                    ({ART_LABEL[d.art] ?? d.art})
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="druck-block">
        <CardHeader>
          <CardTitle className="text-base">Unterschrift Kunde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Name: </span>
            {report.unterschriftName?.trim() ? report.unterschriftName : "–"}
          </p>
          {signatur ? (
            <a href={objectUrl(signatur.r2Key)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={objectUrl(signatur.r2Key)}
                alt="Unterschrift des Kunden"
                loading="lazy"
                className="druck-bild max-h-40 rounded-xl border bg-white"
              />
            </a>
          ) : (
            <p className="text-muted-foreground text-sm">Keine Unterschrift hinterlegt.</p>
          )}
          <p className="text-muted-foreground text-xs">
            Durchgeführt am {dateFmt.format(report.durchgefuehrtAm)}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
