import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { protokollAbschliessen } from "@/app/(mobile)/protokoll/actions";
import { ProtokollForm } from "@/components/mobile/protokoll-form";
import { getDb, installation, maintenanceJob } from "@/lib/db";

export const metadata: Metadata = { title: "Serviceprotokoll" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });

/**
 * Serviceprotokoll vor Ort. `jobId` ist entweder ein bestehender
 * Wartungsauftrag oder "neu" fuer einen spontanen Serviceeinsatz - dann kommt
 * die Anlage aus dem Query-Parameter `installation`.
 *
 * Bei einem bestehenden Auftrag wird die Anlage aus dem Auftrag gelesen, damit
 * ein manipulierter Query-Parameter das Protokoll nicht an die falsche Anlage
 * haengen kann (die Action prueft das erneut).
 *
 * Anlagenname und QR-Token gehen zusaetzlich ans Formular: Es braucht sie fuer
 * die Offline-Outbox (Anzeigename ohne DB) und den Ruecksprung nach dem
 * Offline-Abschliessen.
 */
export default async function ProtokollPage({
  params,
  searchParams,
}: PageProps<"/protokoll/[jobId]">) {
  const { jobId } = await params;
  const { installation: installationParam } = await searchParams;
  const spontan = jobId === "neu";

  let job: {
    faelligAm: Date;
    anlageBezeichnung: string;
    installationId: string;
    qrToken: string;
  } | null = null;
  if (!spontan) {
    const [gefunden] = await getDb()
      .select({
        faelligAm: maintenanceJob.faelligAm,
        anlageBezeichnung: installation.bezeichnung,
        installationId: maintenanceJob.installationId,
        qrToken: installation.qrToken,
      })
      .from(maintenanceJob)
      .innerJoin(installation, eq(installation.id, maintenanceJob.installationId))
      .where(eq(maintenanceJob.id, jobId))
      .limit(1);
    job = gefunden ?? null;
  }

  const installationId =
    job?.installationId ??
    (typeof installationParam === "string" && installationParam ? installationParam : null);

  // Spontanflow: Name und Token der gewaehlten Anlage nachladen (fuer Formular,
  // Outbox und Ruecksprung). Fehlt sie, meldet spaeter die Action den Fehler.
  let spontanAnlage: { bezeichnung: string; qrToken: string } | null = null;
  if (spontan && installationId) {
    const [gefunden] = await getDb()
      .select({ bezeichnung: installation.bezeichnung, qrToken: installation.qrToken })
      .from(installation)
      .where(eq(installation.id, installationId))
      .limit(1);
    spontanAnlage = gefunden ?? null;
  }

  const anlageName = job?.anlageBezeichnung ?? spontanAnlage?.bezeichnung ?? null;
  const qrToken = job?.qrToken ?? spontanAnlage?.qrToken ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Serviceprotokoll</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {spontan
            ? "Spontaner Serviceeinsatz"
            : job
              ? `Auftrag vom ${dateFmt.format(job.faelligAm)} · ${job.anlageBezeichnung}`
              : `Auftrag ${jobId}`}
        </p>
      </div>

      <ProtokollForm
        action={protokollAbschliessen}
        jobId={spontan ? null : jobId}
        installationId={installationId}
        anlageName={anlageName}
        qrToken={qrToken}
      />
    </div>
  );
}
