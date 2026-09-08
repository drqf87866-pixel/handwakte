import { z } from "zod";

/**
 * Rueckgabewert aller Server Actions im Dashboard.
 *
 * Passt auf `useActionState(action, idleState)`: der Hook reicht den letzten
 * Zustand als erstes Argument wieder in die Action hinein.
 */
export type ActionState = {
  ok: boolean;
  /** Meldung fuer den Formularkopf, z.B. bei Fehlern ohne konkretes Feld. */
  message?: string;
  /** Feldname -> erste Fehlermeldung. Mehr braucht das Formular nicht. */
  fieldErrors?: Record<string, string>;
};

export const idleState: ActionState = { ok: false };

/** Zod-Fehler auf je eine Meldung pro Feld eindampfen. */
export function fieldErrors(error: z.ZodError): ActionState {
  const felder: Record<string, string> = {};
  let formFehler: string | undefined;

  for (const issue of error.issues) {
    const feld = issue.path[0];

    if (typeof feld !== "string") {
      formFehler ??= issue.message;
      continue;
    }

    // Erste Meldung je Feld gewinnt - mehr zeigt das Formular ohnehin nicht.
    felder[feld] ??= issue.message;
  }

  return {
    ok: false,
    message: formFehler ?? "Bitte die markierten Felder prüfen.",
    fieldErrors: felder,
  };
}

/**
 * Leere Formularfelder zu `null` normalisieren.
 *
 * Ein nicht ausgefuelltes Input liefert `""`. Ungefiltert landet das als leerer
 * String in der Datenbank und laesst `IS NULL`-Abfragen ins Leere laufen.
 */
export const optionalerText = z
  .string()
  .trim()
  .transform((wert) => (wert === "" ? null : wert))
  .nullable();

/** Optionales Datum aus einem `<input type="date">` ("" oder "2026-09-08"). */
export const optionalesDatum = z
  .string()
  .trim()
  .transform((wert) => (wert === "" ? null : new Date(`${wert}T12:00:00Z`)))
  .nullable()
  .refine((wert) => wert === null || !Number.isNaN(wert.getTime()), "Ungültiges Datum");

/** Optionale Ganzzahl aus einem Zahlenfeld. */
export function optionaleZahl(min: number, max: number) {
  return z
    .string()
    .trim()
    .transform((wert) => (wert === "" ? null : Number(wert)))
    .nullable()
    .refine(
      (wert) => wert === null || (Number.isInteger(wert) && wert >= min && wert <= max),
      `Zahl zwischen ${min} und ${max} erwartet`,
    );
}

/**
 * Erkennt eine verletzte Unique-Constraint (Postgres 23505).
 *
 * Drizzle verpackt den Treiberfehler in einen `DrizzleQueryError`, dessen
 * `message` nur das abgesetzte SQL enthaelt. `code` und `constraint` stehen
 * erst am `NeonDbError` darunter - deshalb die cause-Kette ablaufen.
 */
export function istUniqueVerletzung(error: unknown, constraint: string): boolean {
  for (let aktuell: unknown = error, tiefe = 0; aktuell && tiefe < 5; tiefe++) {
    if (typeof aktuell !== "object") break;

    const kandidat = aktuell as { code?: unknown; constraint?: unknown; cause?: unknown };

    if (String(kandidat.code) === "23505") {
      // Aeltere Treiber liefern den Constraint-Namen nur im Text mit.
      const text = aktuell instanceof Error ? aktuell.message : "";
      if (kandidat.constraint === constraint || text.includes(constraint)) return true;
    }

    aktuell = kandidat.cause;
  }

  return false;
}

export function fehlerText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
