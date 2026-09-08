/**
 * Datum um Monate fortschreiben, fuer die Berechnung der naechsten Wartung.
 *
 * `setMonth` rollt bei zu kurzen Monaten weiter (31.01. + 1 Monat waere der
 * 03.03.). Fuer einen Wartungstermin ist der letzte Tag des Zielmonats die
 * richtige Antwort, deshalb wird zurueckgeklemmt.
 */
export function addMonths(date: Date, monate: number): Date {
  const kopie = new Date(date);
  const zielMonat = kopie.getMonth() + monate;

  kopie.setDate(1);
  kopie.setMonth(zielMonat);

  const letzterTag = new Date(kopie.getFullYear(), kopie.getMonth() + 1, 0).getDate();
  kopie.setDate(Math.min(date.getDate(), letzterTag));

  return kopie;
}

/** `Date` -> "2026-09-08" fuer `<input type="date" defaultValue>`. */
export function alsDateInput(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
