"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import {
  fehlerText,
  fieldErrors,
  istUniqueVerletzung,
  optionalerText,
  type ActionState,
} from "@/lib/actions";
import { customer, getDb, installation } from "@/lib/db";
import { requireSession } from "@/lib/session";

/**
 * Server Actions sind eigene POST-Endpunkte. Der Session-Guard im Layout
 * (src/app/(dashboard)/layout.tsx) schuetzt nur das Rendern der Seite, nicht
 * den Aufruf der Action - deshalb prueft hier jede Action selbst, genau wie
 * /api/upload das tut.
 */
const GUARD = "/kunden";

const kundeSchema = z.object({
  kundennummer: z.string().trim().min(1, "Kundennummer ist Pflicht").max(32),
  name: z.string().trim().min(1, "Name ist Pflicht").max(200),
  ansprechpartner: optionalerText,
  email: z.union([z.literal(""), z.email("Keine gültige E-Mail-Adresse")]).transform(
    (wert) => (wert === "" ? null : wert),
  ),
  telefon: optionalerText,
  strasse: optionalerText,
  plz: optionalerText,
  ort: optionalerText,
  notizen: optionalerText,
});

export async function createKunde(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession(GUARD);

  const parsed = kundeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const id = crypto.randomUUID();

  try {
    await getDb()
      .insert(customer)
      .values({ id, ...parsed.data });
  } catch (error) {
    return kundennummerFehler(error) ?? {
      ok: false,
      message: `Speichern fehlgeschlagen: ${fehlerText(error)}`,
    };
  }

  revalidatePath("/kunden");
  redirect(`/kunden/${id}`);
}

export async function updateKunde(
  kundeId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireSession(GUARD);

  const parsed = kundeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  try {
    await getDb()
      .update(customer)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(customer.id, kundeId));
  } catch (error) {
    return kundennummerFehler(error) ?? {
      ok: false,
      message: `Speichern fehlgeschlagen: ${fehlerText(error)}`,
    };
  }

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${kundeId}`);
  redirect(`/kunden/${kundeId}`);
}

/**
 * Loeschen nur, solange keine Anlage am Kunden haengt.
 *
 * Der Fremdschluessel steht auf `onDelete: "cascade"` - ein unbedachtes
 * Loeschen risse Anlagen, Wartungsauftraege, Protokolle und die
 * Attachment-Metadaten mit, waehrend die Dateien im R2-Bucket verwaist
 * zurueckblieben.
 *
 * Ohne Formularfelder: `useActionState` reicht Zustand und FormData zwar
 * weiter, gebraucht wird hier aber nur die gebundene ID.
 */
export async function deleteKunde(kundeId: string): Promise<ActionState> {
  await requireSession(GUARD);

  const db = getDb();

  try {
    const [{ anzahl }] = await db
      .select({ anzahl: count() })
      .from(installation)
      .where(eq(installation.customerId, kundeId));

    if (anzahl > 0) {
      return {
        ok: false,
        message: `Kunde hat noch ${anzahl} Anlage(n). Erst die Anlagen löschen oder umhängen.`,
      };
    }

    await db.delete(customer).where(eq(customer.id, kundeId));
  } catch (error) {
    return { ok: false, message: `Löschen fehlgeschlagen: ${fehlerText(error)}` };
  }

  revalidatePath("/kunden");
  redirect("/kunden");
}

function kundennummerFehler(error: unknown): ActionState | null {
  if (!istUniqueVerletzung(error, "customer_kundennummer_idx")) return null;

  return {
    ok: false,
    fieldErrors: { kundennummer: "Diese Kundennummer ist bereits vergeben" },
    message: "Bitte die markierten Felder prüfen.",
  };
}
