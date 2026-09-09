import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { fehlerText, optionaleZahl, optionalerText } from "@/lib/actions";
import { addMonths } from "@/lib/dates";
import {
  attachment,
  customer,
  getDb,
  installation,
  maintenanceJob,
  serviceReport,
} from "@/lib/db";
import { sendServiceReportEmail } from "@/lib/email";

/** Job-Status, aus denen ein Protokoll den Auftrag abschliessen darf. */
const OFFENE_STATUS = ["geplant", "terminiert", "ueberfaellig"] as const;

/**
 * Optionale Dezimalzahl aus einem Handy-Eingabefeld. Monteure tippen deutsch
 * ("9,4"), deshalb wird das Komma vor dem Parsen normalisiert.
 */
const optionaleDezimalzahl = z
  .string()
  .trim()
  .transform((wert) => (wert === "" ? null : Number(wert.replace(",", "."))))
  .nullable()
  .refine((wert) => wert === null || Number.isFinite(wert), "Zahl erwartet");

export const protokollSchema = z.object({
  jobId: z
    .string()
    .trim()
    .transform((wert) => (wert === "" ? null : wert))
    .nullable(),
  installationId: z.string().trim().min(1, "Keine Anlage gewählt"),
  abgastemperatur: optionaleDezimalzahl,
  co2: optionaleDezimalzahl,
  druck: optionaleDezimalzahl,
  arbeitszeit: optionaleZahl(1, 1440),
  taetigkeiten: optionalerText,
  maengel: optionalerText,
  empfehlungen: optionalerText,
  unterschriftName: optionalerText,
  /**
   * Kommagetrennte Attachment-IDs aus dieser Formularsitzung (Fotos und
   * Signatur wurden bereits per /api/upload abgelegt). Es werden nur IDs
   * verknuepft, die zu dieser Anlage gehoeren und noch keinem Report
   * zugeordnet sind.
   */
  attachmentIds: z
    .string()
    .trim()
    .optional()
    .transform((wert) =>
      wert
        ? wert
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : [],
    ),
});

export type ProtokollDaten = z.output<typeof protokollSchema>;

export type ProtokollAbschlussErgebnis =
  | {
      ok: true;
      reportId: string;
      jobId: string | null;
      installationId: string;
      qrToken: string;
    }
  | { ok: false; message: string };

/**
 * Kern des Protokoll-Abschlusses, ohne Transport-Beiwerk.
 *
 * Schreibt den service_report-Datensatz, verknuepft Fotos/Signatur, setzt den
 * Auftrag auf "erledigt", schreibt letzte/naechste Wartung fort und stoesst
 * die Kundenbestaetigung an (best effort).
 *
 * Aufrufer: die Server Action `protokollAbschliessen` (Formular, endet mit
 * Redirect) und die Sync-Route `/api/sync/protokoll` (Outbox, JSON-Antwort).
 * Session-Pruefung und Validierung liegen bei den Aufrufern.
 *
 * Spontanflow (`jobId` null): Gehoert zur Anlage ein offener Auftrag, wird
 * der frueheste uebernommen und abgeschlossen - sonst bliebe er als
 * Karteileiche im Dashboard, obwohl die Anlage gerade gewartet wurde.
 */
export async function protokollAbschliessenKern(
  daten: ProtokollDaten,
  monteur: { id: string; name: string | null },
): Promise<ProtokollAbschlussErgebnis> {
  const db = getDb();

  const [anlage] = await db
    .select({
      id: installation.id,
      bezeichnung: installation.bezeichnung,
      qrToken: installation.qrToken,
      wartungsintervallMonate: installation.wartungsintervallMonate,
      naechsteWartungAm: installation.naechsteWartungAm,
      kundeName: customer.name,
      kundeEmail: customer.email,
    })
    .from(installation)
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .where(eq(installation.id, daten.installationId))
    .limit(1);

  if (!anlage) {
    return { ok: false, message: "Anlage nicht gefunden. Bitte erneut scannen." };
  }

  // Auftrag klaeren: explizit gewaehlt oder fruehester offener der Anlage.
  let job: { id: string; status: string } | undefined;
  if (daten.jobId) {
    const [gefunden] = await db
      .select({ id: maintenanceJob.id, status: maintenanceJob.status })
      .from(maintenanceJob)
      .where(eq(maintenanceJob.id, daten.jobId))
      .limit(1);

    if (!gefunden) {
      return { ok: false, message: "Auftrag nicht gefunden." };
    }
    if (!(OFFENE_STATUS as readonly string[]).includes(gefunden.status)) {
      return { ok: false, message: "Dieser Auftrag ist bereits abgeschlossen." };
    }
    job = gefunden;
  } else {
    const [offen] = await db
      .select({ id: maintenanceJob.id, status: maintenanceJob.status })
      .from(maintenanceJob)
      .where(
        and(
          eq(maintenanceJob.installationId, anlage.id),
          inArray(maintenanceJob.status, [...OFFENE_STATUS]),
        ),
      )
      .orderBy(asc(maintenanceJob.faelligAm))
      .limit(1);
    job = offen;
  }

  const jetzt = new Date();
  const messwerte = {
    ...(daten.abgastemperatur !== null ? { abgastemperatur: daten.abgastemperatur } : {}),
    ...(daten.co2 !== null ? { co2: daten.co2 } : {}),
    ...(daten.druck !== null ? { druck: daten.druck } : {}),
  };

  const reportId = crypto.randomUUID();

  try {
    await db.insert(serviceReport).values({
      id: reportId,
      jobId: job?.id ?? null,
      installationId: anlage.id,
      monteurId: monteur.id,
      durchgefuehrtAm: jetzt,
      arbeitszeitMinuten: daten.arbeitszeit,
      messwerte: Object.keys(messwerte).length > 0 ? messwerte : null,
      taetigkeiten: daten.taetigkeiten,
      maengel: daten.maengel,
      empfehlungen: daten.empfehlungen,
      unterschriftName: daten.unterschriftName,
    });
  } catch (error) {
    return { ok: false, message: `Protokoll konnte nicht gespeichert werden: ${fehlerText(error)}` };
  }

  // Fotos/Signatur dieser Sitzung dem Report zuordnen. Fremde IDs (andere
  // Anlage, bereits zugeordnet) filtert die WHERE-Bedingung heraus.
  let unterschriftKey: string | null = null;
  try {
    if (daten.attachmentIds.length > 0) {
      await db
        .update(attachment)
        .set({ reportId })
        .where(
          and(
            inArray(attachment.id, daten.attachmentIds),
            eq(attachment.installationId, anlage.id),
            isNull(attachment.reportId),
          ),
        );
    }

    // Signatur-Key serverseitig aus den verknuepften Dateien ableiten, nicht
    // aus dem Formular uebernehmen. Bei mehrfachem Unterschreiben gewinnt die
    // juengste.
    const [signatur] = await db
      .select({ r2Key: attachment.r2Key })
      .from(attachment)
      .where(
        and(
          eq(attachment.reportId, reportId),
          eq(attachment.art, "signatur"),
        ),
      )
      .orderBy(desc(attachment.createdAt))
      .limit(1);

    unterschriftKey = signatur?.r2Key ?? null;
    if (unterschriftKey) {
      await db
        .update(serviceReport)
        .set({ unterschriftKey, updatedAt: jetzt })
        .where(eq(serviceReport.id, reportId));
    }
  } catch (error) {
    // Report steht bereits - verwaiste Zuordnung ist heilbar, Datenverlust
    // nicht. Fehler nur protokollieren und fortfahren.
    console.error("[protokoll] Attachment-Verknuepfung fehlgeschlagen", error);
  }

  if (job) {
    try {
      await db
        .update(maintenanceJob)
        .set({ status: "erledigt", updatedAt: jetzt })
        .where(eq(maintenanceJob.id, job.id));
    } catch (error) {
      return {
        ok: false,
        message: `Protokoll gespeichert, Auftrag konnte nicht abgeschlossen werden: ${fehlerText(error)}`,
      };
    }
  }

  // Folgetermin fortschreiben. Berechnet aus heute + Intervall - aber ein vom
  // Buero manuell weiter in die Zukunft gelegter Termin gewinnt (Philosophie
  // wie im Anlage-Formular: Handarbeit schlaegt Automatik).
  try {
    const berechnet = addMonths(jetzt, anlage.wartungsintervallMonate);
    const naechste =
      anlage.naechsteWartungAm && anlage.naechsteWartungAm > berechnet
        ? anlage.naechsteWartungAm
        : berechnet;

    await db
      .update(installation)
      .set({ letzteWartungAm: jetzt, naechsteWartungAm: naechste, updatedAt: jetzt })
      .where(eq(installation.id, anlage.id));
  } catch (error) {
    return {
      ok: false,
      message: `Protokoll gespeichert, Folgetermin konnte nicht fortgeschrieben werden: ${fehlerText(error)}`,
    };
  }

  // Kundenbestaetigung ist best effort: Ein Mailfehler darf das gespeicherte
  // Protokoll nicht kippen (ohne verifizierte Absenderdomain stellt Resend in
  // dev nur an die eigene Account-Adresse zu).
  if (anlage.kundeEmail) {
    try {
      await sendServiceReportEmail({
        to: anlage.kundeEmail,
        kunde: anlage.kundeName,
        anlage: anlage.bezeichnung,
        durchgefuehrtAm: jetzt,
        monteur: monteur.name,
        maengel: daten.maengel,
        empfehlungen: daten.empfehlungen,
      });
    } catch (error) {
      console.error("[protokoll] Bestaetigungsmail fehlgeschlagen", error);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/anlagen/${anlage.id}`);

  return {
    ok: true,
    reportId,
    jobId: job?.id ?? null,
    installationId: anlage.id,
    qrToken: anlage.qrToken,
  };
}
