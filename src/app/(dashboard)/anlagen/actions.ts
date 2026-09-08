"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  fehlerText,
  fieldErrors,
  istUniqueVerletzung,
  optionaleZahl,
  optionalerText,
  optionalesDatum,
  type ActionState,
} from "@/lib/actions";
import { addMonths } from "@/lib/dates";
import { getDb, installation } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { generateQrToken } from "@/lib/tokens";

/** Siehe Hinweis in ../kunden/actions.ts: jede Action prueft selbst. */
const GUARD = "/anlagen";

const anlageSchema = z.object({
  customerId: z.string().trim().min(1, "Kunde ist Pflicht"),
  bezeichnung: z.string().trim().min(1, "Bezeichnung ist Pflicht").max(200),
  hersteller: optionalerText,
  modell: optionalerText,
  serienNr: optionalerText,
  baujahr: optionaleZahl(1900, new Date().getFullYear() + 1),
  standort: optionalerText,
  strasse: optionalerText,
  plz: optionalerText,
  ort: optionalerText,
  wartungsintervallMonate: z.coerce
    .number()
    .int()
    .min(1, "Mindestens 1 Monat")
    .max(120, "Höchstens 120 Monate"),
  letzteWartungAm: optionalesDatum,
  naechsteWartungAm: optionalesDatum,
});

type AnlageDaten = z.output<typeof anlageSchema>;

/**
 * Bleibt die naechste Wartung leer, wird sie aus der letzten Wartung und dem
 * Intervall abgeleitet. Ein eingetragener Wert gewinnt immer - das Buero
 * verschiebt Termine haendisch.
 *
 * Ohne dieses Feld findet der taegliche Wartungs-Scan die Anlage nie
 * (`isNotNull(installation.naechsteWartungAm)` in src/lib/jobs/maintenance.ts).
 */
function mitFolgetermin(daten: AnlageDaten) {
  if (daten.naechsteWartungAm || !daten.letzteWartungAm) return daten;

  return {
    ...daten,
    naechsteWartungAm: addMonths(daten.letzteWartungAm, daten.wartungsintervallMonate),
  };
}

export async function createAnlage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession(GUARD);

  const parsed = anlageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const werte = mitFolgetermin(parsed.data);
  const db = getDb();
  let id = "";

  // installation_qr_token_idx ist unique. Eine Kollision ist bei 12 Zeichen
  // praktisch ausgeschlossen, aber ein zweiter Versuch ist billiger als ein
  // 500er im Buero.
  for (let versuch = 0; versuch < 3; versuch++) {
    id = crypto.randomUUID();

    try {
      await db.insert(installation).values({ id, ...werte, qrToken: generateQrToken() });
      break;
    } catch (error) {
      if (istUniqueVerletzung(error, "installation_qr_token_idx") && versuch < 2) continue;
      return { ok: false, message: `Speichern fehlgeschlagen: ${fehlerText(error)}` };
    }
  }

  revalidatePath("/anlagen");
  revalidatePath(`/kunden/${werte.customerId}`);
  redirect(`/anlagen/${id}`);
}

export async function updateAnlage(
  anlageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession(GUARD);

  const parsed = anlageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  // qrToken bleibt unangetastet - der Aufkleber klebt bereits an der Anlage.
  try {
    await getDb()
      .update(installation)
      .set({ ...mitFolgetermin(parsed.data), updatedAt: new Date() })
      .where(eq(installation.id, anlageId));
  } catch (error) {
    return { ok: false, message: `Speichern fehlgeschlagen: ${fehlerText(error)}` };
  }

  revalidatePath("/anlagen");
  revalidatePath(`/anlagen/${anlageId}`);
  revalidatePath(`/kunden/${parsed.data.customerId}`);
  redirect(`/anlagen/${anlageId}`);
}

/**
 * Anlagen werden deaktiviert statt geloescht.
 *
 * Der Wartungs-Scan filtert auf `aktiv = true`, eine inaktive Anlage faellt
 * also sauber aus dem Turnus - Protokolle, Fotos und Historie bleiben aber
 * erhalten. Ein echtes Loeschen bietet die Oberflaeche bewusst nicht an.
 */
export async function setAnlageAktiv(
  anlageId: string,
  aktiv: boolean,
): Promise<ActionState> {
  await requireSession(GUARD);

  try {
    await getDb()
      .update(installation)
      .set({ aktiv, updatedAt: new Date() })
      .where(eq(installation.id, anlageId));
  } catch (error) {
    return { ok: false, message: `Ändern fehlgeschlagen: ${fehlerText(error)}` };
  }

  revalidatePath("/anlagen");
  revalidatePath(`/anlagen/${anlageId}`);
  revalidatePath("/dashboard");

  return { ok: true, message: aktiv ? "Anlage aktiviert" : "Anlage deaktiviert" };
}
