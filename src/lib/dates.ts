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

const berlinDatumFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const berlinWochentagFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  weekday: "short",
});

const berlinZeitFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function teileLesen(fmt: Intl.DateTimeFormat, datum: Date): Record<string, string> {
  return Object.fromEntries(fmt.formatToParts(datum).map((t) => [t.type, t.value]));
}

/**
 * Offset von Europe/Berlin gegenueber UTC in Millisekunden, gueltig am
 * uebergebenen Zeitpunkt. Ein Durchgang reicht: Auf einem Kalendertag liegt
 * hoechstens ein DST-Wechsel und nie zwischen UTC- und Berlin-Mitternacht
 * desselben Tages auf eine Weise, die das Ergebnis kippt.
 */
function berlinOffsetMs(zeitpunkt: Date): number {
  const t = teileLesen(berlinZeitFmt, zeitpunkt);
  const berlinAlsUtc = Date.UTC(
    Number(t.year),
    Number(t.month) - 1,
    Number(t.day),
    Number(t.hour),
    Number(t.minute),
    Number(t.second),
  );
  return berlinAlsUtc - zeitpunkt.getTime();
}

/**
 * Beginn (00:00 Europe/Berlin) eines Kalendertags als Date.
 * `versatzTage` zaehlt ab heute in Berlin (0 = heute, 1 = morgen).
 */
export function berlinTagesStart(stichtag: Date = new Date(), versatzTage = 0): Date {
  const t = teileLesen(berlinDatumFmt, stichtag);
  const roh = new Date(
    Date.UTC(Number(t.year), Number(t.month) - 1, Number(t.day) + versatzTage),
  );
  return new Date(roh.getTime() - berlinOffsetMs(roh));
}

/** Ende (23:59:59.999 Europe/Berlin) eines Kalendertags als Date. */
export function berlinTagesEnde(stichtag: Date = new Date(), versatzTage = 0): Date {
  return new Date(berlinTagesStart(stichtag, versatzTage + 1).getTime() - 1);
}

const WTAG_INDEX: Record<string, number> = {
  So: 0,
  Mo: 1,
  Di: 2,
  Mi: 3,
  Do: 4,
  Fr: 5,
  Sa: 6,
};

/** Beginn (Montag 00:00 Europe/Berlin) der Woche des Stichtags. */
export function berlinWochenStart(stichtag: Date = new Date()): Date {
  const kurz = berlinWochentagFmt.format(stichtag);
  const versatzZumMontag = ((WTAG_INDEX[kurz] ?? 1) + 6) % 7;
  return berlinTagesStart(stichtag, -versatzZumMontag);
}

/** Ende (Sonntag 23:59:59.999 Europe/Berlin) der Woche des Stichtags. */
export function berlinWochenEnde(stichtag: Date = new Date()): Date {
  return new Date(berlinWochenStart(stichtag).getTime() + 7 * 86_400_000 - 1);
}
