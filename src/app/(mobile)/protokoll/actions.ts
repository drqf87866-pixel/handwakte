"use server";

import { redirect } from "next/navigation";

import { fieldErrors, type ActionState } from "@/lib/actions";
import { protokollAbschliessenKern, protokollSchema } from "@/lib/protokoll-abschluss";
import { requireSession } from "@/lib/session";

/** Siehe Hinweis in (dashboard)/kunden/actions.ts: jede Action prueft selbst. */
const GUARD = "/scan";

/**
 * Schliesst ein Serviceprotokoll ab (Formular-Weg, endet mit Redirect).
 *
 * Die eigentliche Arbeit liegt in `protokollAbschliessenKern`
 * (src/lib/protokoll-abschluss.ts) - dieselbe Funktion bedient auch die
 * Sync-Route /api/sync/protokoll fuer offline erfasste Protokolle.
 */
export async function protokollAbschliessen(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession(GUARD);

  const parsed = protokollSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);

  const ergebnis = await protokollAbschliessenKern(parsed.data, {
    id: session.user.id,
    name: session.user.name,
  });

  if (!ergebnis.ok) return { ok: false, message: ergebnis.message };

  redirect(`/anlage/${ergebnis.qrToken}`);
}
