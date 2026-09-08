import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";

import { getDb, customer, installation, maintenanceJob } from "@/lib/db";
import { sendMaintenanceDueEmail } from "@/lib/email";

/** Wie weit im Voraus eine faellige Wartung eingeplant wird. */
export const VORLAUF_TAGE = 30;

/** Job-Status, die als "noch offen" zaehlen. */
const OFFENE_STATUS = ["geplant", "terminiert", "ueberfaellig"] as const;

export type MaintenanceScanResult = {
  geprueft: number;
  jobsErstellt: number;
  mailsGesendet: number;
  fehler: string[];
};

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Taeglicher Wartungs-Scan (Cron 06:00 UTC, siehe wrangler.jsonc).
 *
 * Sucht Anlagen, deren naechste Wartung innerhalb der Vorlaufzeit faellig wird,
 * legt fuer sie einen Wartungsauftrag an und benachrichtigt das Buero.
 *
 * Idempotent: Anlagen mit bereits offenem Auftrag werden uebersprungen, ein
 * zweiter Lauf am selben Tag erzeugt also keine Duplikate.
 */
export async function runMaintenanceScan(now: Date = new Date()): Promise<MaintenanceScanResult> {
  const db = getDb();
  const result: MaintenanceScanResult = {
    geprueft: 0,
    jobsErstellt: 0,
    mailsGesendet: 0,
    fehler: [],
  };

  const grenze = addDays(now, VORLAUF_TAGE);

  const faellige = await db
    .select({
      installationId: installation.id,
      bezeichnung: installation.bezeichnung,
      standort: installation.standort,
      naechsteWartungAm: installation.naechsteWartungAm,
      kundeName: customer.name,
      kundeEmail: customer.email,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(
      and(
        eq(installation.aktiv, true),
        isNotNull(installation.naechsteWartungAm),
        lte(installation.naechsteWartungAm, grenze),
      ),
    );

  result.geprueft = faellige.length;
  if (faellige.length === 0) return result;

  // Ein Roundtrip statt einer Abfrage pro Anlage.
  const offeneJobs = await db
    .select({ installationId: maintenanceJob.installationId })
    .from(maintenanceJob)
    .where(
      and(
        inArray(
          maintenanceJob.installationId,
          faellige.map((f) => f.installationId),
        ),
        inArray(maintenanceJob.status, [...OFFENE_STATUS]),
      ),
    );

  const hatOffenenJob = new Set(offeneJobs.map((j) => j.installationId));
  const empfaenger = process.env.MAINTENANCE_NOTIFY_EMAIL;

  for (const anlage of faellige) {
    if (hatOffenenJob.has(anlage.installationId)) continue;

    const faelligAm = anlage.naechsteWartungAm ?? now;
    const ueberfaellig = faelligAm < now;

    const jobId = crypto.randomUUID();

    try {
      await db.insert(maintenanceJob).values({
        id: jobId,
        installationId: anlage.installationId,
        faelligAm,
        status: ueberfaellig ? "ueberfaellig" : "geplant",
      });
      result.jobsErstellt += 1;
    } catch (error) {
      result.fehler.push(`Job fuer ${anlage.bezeichnung}: ${errorMessage(error)}`);
      continue;
    }

    if (!empfaenger) continue;

    try {
      await sendMaintenanceDueEmail({
        to: empfaenger,
        kunde: anlage.kundeName,
        anlage: anlage.bezeichnung,
        standort: anlage.standort,
        faelligAm,
      });
      // Erst nach erfolgreichem Versand markieren, damit ein Fehlschlag beim
      // naechsten Lauf erneut versucht wird.
      await db
        .update(maintenanceJob)
        .set({ erinnerungGesendetAm: now })
        .where(eq(maintenanceJob.id, jobId));
      result.mailsGesendet += 1;
    } catch (error) {
      // Der Auftrag steht bereits in der DB - eine fehlgeschlagene Mail darf den
      // Lauf nicht abbrechen.
      result.fehler.push(`Mail fuer ${anlage.bezeichnung}: ${errorMessage(error)}`);
    }
  }

  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
