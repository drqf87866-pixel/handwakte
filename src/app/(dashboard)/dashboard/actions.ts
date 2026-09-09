"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  fehlerText,
  fieldErrors,
  optionalerText,
  type ActionState,
} from "@/lib/actions";
import { getDb, maintenanceJob, user } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Server Actions sind eigene POST-Endpunkte. Der Session-Guard im Layout
 * (src/app/(dashboard)/layout.tsx) schuetzt nur das Rendern der Seite, nicht
 * den Aufruf der Action - deshalb prueft hier jede Action selbst, genau wie
 * /api/upload das tut.
 */
const GUARD = "/dashboard";

/** Status, aus denen heraus ein Auftrag (erneut) terminiert werden darf. */
const TERMINIERBAR = ["geplant", "terminiert", "ueberfaellig"] as const;

/** Status, aus denen heraus ein Auftrag storniert werden darf. */
const STORNIERBAR = ["geplant", "terminiert", "ueberfaellig"] as const;

/** Pflichtdatum aus einem `<input type="date">` ("" oder "2026-09-08"). */
const pflichtDatum = z
  .string()
  .trim()
  .min(1, "Termin ist Pflicht")
  .transform((wert) => new Date(`${wert}T12:00:00Z`))
  .refine((wert) => !Number.isNaN(wert.getTime()), "Ungültiges Datum");

const terminSchema = z.object({
  terminAm: pflichtDatum,
  monteurId: z
    .string()
    .trim()
    .transform((wert) => (wert === "" ? null : wert))
    .nullable(),
  notiz: optionalerText,
});

/**
 * Auftrag terminieren: Termin (Pflicht), Monteur (optional) und Notiz setzen,
 * Status wird `terminiert`.
 *
 * Darf auch aus `terminiert` heraus erneut aufgerufen werden (Umbuchen).
 * `erledigt` und `storniert` sind Endzustaende - dort fuehrt kein Weg zurueck,
 * ein stornierter Auftrag gibt die Anlage fuer den naechsten Scan wieder frei.
 */
export async function terminAuftrag(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession(GUARD);

  const parsed = terminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const db = getDb();
  const [job] = await db
    .select({
      id: maintenanceJob.id,
      status: maintenanceJob.status,
      installationId: maintenanceJob.installationId,
    })
    .from(maintenanceJob)
    .where(eq(maintenanceJob.id, jobId))
    .limit(1);

  if (!job) return { ok: false, message: "Auftrag nicht gefunden." };
  if (!(TERMINIERBAR as readonly string[]).includes(job.status)) {
    return {
      ok: false,
      message: `Auftrag ist bereits ${job.status} und kann nicht mehr terminiert werden.`,
    };
  }

  // Monteur ist optional, muss aber existieren, wenn einer gewaehlt wurde.
  if (parsed.data.monteurId) {
    const [monteur] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, parsed.data.monteurId))
      .limit(1);
    if (!monteur) {
      return {
        ok: false,
        message: "Bitte die markierten Felder prüfen.",
        fieldErrors: { monteurId: "Unbekannter Monteur" },
      };
    }
  }

  try {
    await db
      .update(maintenanceJob)
      .set({
        terminAm: parsed.data.terminAm,
        monteurId: parsed.data.monteurId,
        notiz: parsed.data.notiz,
        status: "terminiert",
        updatedAt: new Date(),
      })
      .where(eq(maintenanceJob.id, jobId));
  } catch (error) {
    return { ok: false, message: `Speichern fehlgeschlagen: ${fehlerText(error)}` };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath(`/anlagen/${job.installationId}`);

  return { ok: true, message: "Auftrag terminiert" };
}

/**
 * Auftrag stornieren (z.B. Anlage ausser Betreuung, Doppelanlage).
 *
 * Der stornierte Auftrag bleibt in der Historie sichtbar, zaehlt aber nicht
 * mehr als offen - der naechste Wartungs-Scan legt bei Bedarf einen neuen an.
 */
export async function storniereAuftrag(jobId: string): Promise<ActionState> {
  await requireSession(GUARD);

  const db = getDb();
  const [job] = await db
    .select({
      id: maintenanceJob.id,
      status: maintenanceJob.status,
      installationId: maintenanceJob.installationId,
    })
    .from(maintenanceJob)
    .where(eq(maintenanceJob.id, jobId))
    .limit(1);

  if (!job) return { ok: false, message: "Auftrag nicht gefunden." };
  if (!(STORNIERBAR as readonly string[]).includes(job.status)) {
    return {
      ok: false,
      message: `Auftrag ist bereits ${job.status} und kann nicht mehr storniert werden.`,
    };
  }

  try {
    await db
      .update(maintenanceJob)
      .set({ status: "storniert", updatedAt: new Date() })
      .where(eq(maintenanceJob.id, jobId));
  } catch (error) {
    return { ok: false, message: `Stornieren fehlgeschlagen: ${fehlerText(error)}` };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath(`/anlagen/${job.installationId}`);

  return { ok: true, message: "Auftrag storniert" };
}
