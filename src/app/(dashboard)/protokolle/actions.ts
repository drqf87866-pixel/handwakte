"use server";

import { fehlerText, type ActionState } from "@/lib/actions";
import { sendServiceReportPdfEmail } from "@/lib/email";
import { erzeugeProtokollPdf, ladeProtokollFuerPdf, protokollDateiname } from "@/lib/protokoll-pdf";
import { requireSession } from "@/lib/session";

/**
 * Serviceprotokoll als PDF an die Kunden-E-Mail senden (dasselbe PDF wie der
 * Download unter /api/protokolle/[id]/pdf).
 *
 * Wie beim Protokoll-Abschluss: strikt bei den Daten (Protokoll fehlt, keine
 * Kunden-E-Mail, PDF nicht erzeugbar), best effort bei der Mail - ein
 * Resend-Fehler wird nur geloggt, ohne verifizierte Domain waere die Funktion
 * in dev sonst unbenutzbar.
 */
export async function protokollPdfSenden(reportId: string): Promise<ActionState> {
  await requireSession(`/protokolle/${reportId}`);

  const daten = await ladeProtokollFuerPdf(reportId);
  if (!daten) return { ok: false, message: "Protokoll nicht gefunden." };

  const email = daten.kundeEmail?.trim();
  if (!email) {
    return {
      ok: false,
      message: "Keine E-Mail beim Kunden hinterlegt. Bitte zuerst beim Kunden eintragen.",
    };
  }

  let pdf: Uint8Array;
  try {
    pdf = await erzeugeProtokollPdf(daten);
  } catch (error) {
    return { ok: false, message: `PDF konnte nicht erzeugt werden: ${fehlerText(error)}` };
  }

  try {
    await sendServiceReportPdfEmail({
      to: email,
      kunde: daten.kunde,
      anlage: daten.anlage,
      durchgefuehrtAm: daten.report.durchgefuehrtAm,
      dateiname: protokollDateiname(daten),
      pdf,
    });
  } catch (error) {
    console.error("[protokoll] PDF-Versand an Kunden fehlgeschlagen", error);
    return {
      ok: true,
      message: `PDF erstellt, Zustellung an ${email} aber nicht bestaetigt (Details im Server-Log).`,
    };
  }

  return { ok: true, message: `Protokoll als PDF an ${email} gesendet.` };
}
