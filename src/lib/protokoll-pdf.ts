import { and, desc, eq } from "drizzle-orm";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type Color,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { attachment, customer, getDb, installation, serviceReport, user } from "@/lib/db";
import { getObject } from "@/lib/r2";

/**
 * Serviceprotokoll als PDF, inhaltlich wie die Druckansicht unter
 * /protokolle/[id] (Kopfdaten, Messwerte, Textbloecke, Unterschrift).
 *
 * pdf-lib ist reines JavaScript ohne Canvas, Dateisystem oder native Module
 * und laeuft deshalb unveraendert im Worker. Es gibt keine Layout-Engine:
 * Zeilenumbruch und Seitenwechsel passieren hier von Hand.
 *
 * Genutzt von der Download-Route /api/protokolle/[id]/pdf und der Server
 * Action `protokollPdfSenden` - Session-Pruefung liegt bei den Aufrufern.
 */

const dateFmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "Europe/Berlin" });
const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});
/** "2026-09-11" in Berliner Zeit, fuer den Dateinamen. */
const isoTagFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export async function ladeProtokollFuerPdf(reportId: string) {
  const [zeile] = await getDb()
    .select({
      report: serviceReport,
      anlage: installation.bezeichnung,
      standort: installation.standort,
      strasse: installation.strasse,
      plz: installation.plz,
      ort: installation.ort,
      kunde: customer.name,
      kundennummer: customer.kundennummer,
      kundeEmail: customer.email,
      monteur: user.name,
    })
    .from(serviceReport)
    .innerJoin(installation, eq(installation.id, serviceReport.installationId))
    .innerJoin(customer, eq(customer.id, installation.customerId))
    .leftJoin(user, eq(user.id, serviceReport.monteurId))
    .where(eq(serviceReport.id, reportId))
    .limit(1);

  return zeile;
}

export type ProtokollPdfDaten = NonNullable<Awaited<ReturnType<typeof ladeProtokollFuerPdf>>>;

/** z.B. `protokoll-k-1001-2026-09-11.pdf` - nur ASCII, damit kein Header-Encoding noetig ist. */
export function protokollDateiname(daten: ProtokollPdfDaten): string {
  const nummer =
    daten.kundennummer
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kunde";
  return `protokoll-${nummer}-${isoTagFmt.format(daten.report.durchgefuehrtAm)}.pdf`;
}

/* Layout in PDF-Punkten (A4, 1 pt = 1/72 Zoll). */
const SEITE: [number, number] = [595.28, 841.89];
const RAND = 50;
const BREITE = SEITE[0] - 2 * RAND;
const LABEL_BREITE = 140;
const FUSS_HOEHE = 30;

const SCHWARZ = rgb(0.11, 0.1, 0.09);
const GRAU = rgb(0.34, 0.33, 0.31);
const LINIE = rgb(0.9, 0.9, 0.89);

/**
 * Die Standardschriften kennen nur WinAnsi (Latin-1 plus Euro, Gedankenstrich
 * usw.). Umlaute gehen, Emojis oder ein tiefgestelltes "2" aus Freitext
 * liessen pdf-lib werfen - solche Zeichen werden ersetzt statt das PDF zu
 * kippen. Zeilenumbrueche bleiben fuer `umbrechen()` stehen.
 */
function zeichenFilter(font: PDFFont) {
  const erlaubt = new Set(font.getCharacterSet());
  const darstellbar = (s: string) => Array.from(s).every((z) => erlaubt.has(z.codePointAt(0)!));

  return (text: string) =>
    Array.from(text.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").replace(/[^\S\n]/g, " "))
      .map((zeichen) => {
        if (zeichen === "\n" || darstellbar(zeichen)) return zeichen;
        // Kompatibilitaetsform versuchen (tiefgestellte Ziffern, Vollbreite, Ligaturen).
        const ersatz = zeichen.normalize("NFKC");
        return darstellbar(ersatz) ? ersatz : "?";
      })
      .join("");
}

/** Text auf Zeilen der Breite `maxBreite` umbrechen; Zeilenumbrueche im Text bleiben erhalten. */
function umbrechen(text: string, font: PDFFont, groesse: number, maxBreite: number): string[] {
  const breite = (s: string) => font.widthOfTextAtSize(s, groesse);
  const zeilen: string[] = [];

  for (const absatz of text.split("\n")) {
    let zeile = "";
    for (const wort of absatz.split(" ")) {
      const kandidat = zeile ? `${zeile} ${wort}` : wort;
      if (breite(kandidat) <= maxBreite) {
        zeile = kandidat;
        continue;
      }
      if (zeile) zeilen.push(zeile);
      // Ueberlange Woerter (URLs, Seriennummern) hart zerteilen.
      zeile = "";
      for (const zeichen of Array.from(wort)) {
        if (zeile && breite(zeile + zeichen) > maxBreite) {
          zeilen.push(zeile);
          zeile = "";
        }
        zeile += zeichen;
      }
    }
    zeilen.push(zeile);
  }

  return zeilen;
}

/**
 * Juengste Signatur des Reports aus R2 (wie auf der Detailseite). `bild` ist
 * null, wenn die Datei fehlt oder weder PNG noch JPEG ist - pdf-lib kann
 * nur diese beiden Formate einbetten.
 */
async function ladeUnterschrift(
  pdf: PDFDocument,
  reportId: string,
): Promise<{ vorhanden: boolean; bild: PDFImage | null }> {
  const [signatur] = await getDb()
    .select({ r2Key: attachment.r2Key })
    .from(attachment)
    .where(and(eq(attachment.reportId, reportId), eq(attachment.art, "signatur")))
    .orderBy(desc(attachment.createdAt))
    .limit(1);

  if (!signatur) return { vorhanden: false, bild: null };

  const objekt = await getObject(signatur.r2Key);
  if (!objekt) return { vorhanden: true, bild: null };

  const bytes = new Uint8Array(await objekt.arrayBuffer());
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { vorhanden: true, bild: await pdf.embedPng(bytes) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return { vorhanden: true, bild: await pdf.embedJpg(bytes) };
  }
  return { vorhanden: true, bild: null };
}

export async function erzeugeProtokollPdf(daten: ProtokollPdfDaten): Promise<Uint8Array> {
  const { report } = daten;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Serviceprotokoll ${daten.anlage} (${daten.kunde})`);
  pdf.setCreator("Digitale Bauakte");
  pdf.setLanguage("de-DE");

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const fett = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sauber = zeichenFilter(normal);

  let seite: PDFPage = pdf.addPage(SEITE);
  let y = SEITE[1] - RAND;

  /** Seitenwechsel, falls der naechste Block nicht mehr ueber den Fuss passt. */
  function platz(hoehe: number) {
    if (y - hoehe >= RAND + FUSS_HOEHE) return;
    seite = pdf.addPage(SEITE);
    y = SEITE[1] - RAND;
  }

  function text(
    inhalt: string,
    optionen: { font?: PDFFont; groesse?: number; x?: number; breite?: number; farbe?: Color } = {},
  ) {
    const { font = normal, groesse = 10, x = RAND, breite = BREITE, farbe = SCHWARZ } = optionen;
    const zeilenHoehe = groesse * 1.4;
    for (const zeile of umbrechen(sauber(inhalt), font, groesse, breite)) {
      platz(zeilenHoehe);
      y -= zeilenHoehe;
      seite.drawText(zeile, { x, y: y + groesse * 0.3, size: groesse, font, color: farbe });
    }
  }

  function trennlinie() {
    platz(12);
    y -= 6;
    seite.drawLine({
      start: { x: RAND, y },
      end: { x: RAND + BREITE, y },
      thickness: 0.75,
      color: LINIE,
    });
    y -= 6;
  }

  function ueberschrift(inhalt: string) {
    platz(40);
    y -= 12;
    text(inhalt, { font: fett, groesse: 12 });
    y -= 2;
  }

  /** Zweispaltige Zeile: Label links grau, Wert daneben (umbrechend). */
  function tabellenZeile(label: string, wert: string) {
    platz(14);
    const start = y;
    const startSeite = seite;
    text(label, { farbe: GRAU, breite: LABEL_BREITE - 10 });
    const nachLabel = y;
    // Wert oben buendig neben das Label, sofern das Label nicht umgebrochen wurde.
    if (seite === startSeite) y = start;
    text(wert, { x: RAND + LABEL_BREITE, breite: BREITE - LABEL_BREITE });
    if (seite === startSeite) y = Math.min(y, nachLabel);
    trennlinie();
  }

  // Kopf
  text("Serviceprotokoll", { font: fett, groesse: 18 });
  text(`${daten.anlage} (${daten.kunde})`, { groesse: 12, farbe: GRAU });
  y -= 8;

  const adresse = [daten.strasse, [daten.plz, daten.ort].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const kopf: Array<[string, string | null]> = [
    ["Kunde", daten.kunde],
    ["Kundennummer", daten.kundennummer],
    ["Anlage", daten.anlage],
    ["Standort", daten.standort],
    ["Adresse", adresse || null],
    ["Durchgefuehrt am", dateTimeFmt.format(report.durchgefuehrtAm)],
    ["Monteur", daten.monteur ?? "-"],
  ];
  for (const [label, wert] of kopf) if (wert) tabellenZeile(label, wert);

  // Messwerte (Formatierung wie auf der Detailseite)
  const messwerte = report.messwerte ?? {};
  ueberschrift("Messwerte");
  const messwerteZeilen: Array<[string, string]> = [
    ["Abgastemperatur", messwerte.abgastemperatur != null ? `${messwerte.abgastemperatur} °C` : "-"],
    ["CO2", messwerte.co2 != null ? `${messwerte.co2} %` : "-"],
    ["Druck", messwerte.druck != null ? `${messwerte.druck} bar` : "-"],
    ["Arbeitszeit", report.arbeitszeitMinuten != null ? `${report.arbeitszeitMinuten} min` : "-"],
  ];
  for (const [label, wert] of messwerteZeilen) tabellenZeile(label, wert);

  // Textbloecke
  ueberschrift("Taetigkeiten, Maengel und Empfehlungen");
  const berichte: Array<[string, string | null]> = [
    ["Durchgefuehrte Taetigkeiten", report.taetigkeiten],
    ["Festgestellte Maengel", report.maengel],
    ["Empfehlungen", report.empfehlungen],
  ];
  for (const [label, wert] of berichte) {
    y -= 4;
    text(label.toUpperCase(), { font: fett, groesse: 8, farbe: GRAU });
    text(wert?.trim() ? wert : "-");
  }

  // Unterschrift
  ueberschrift("Unterschrift Kunde");
  text(`Name: ${report.unterschriftName?.trim() ? report.unterschriftName : "-"}`);

  const unterschrift = await ladeUnterschrift(pdf, report.id);
  if (unterschrift.bild) {
    const { width, height } = unterschrift.bild.scaleToFit(220, 90);
    platz(height + 8);
    y -= height + 4;
    seite.drawImage(unterschrift.bild, { x: RAND, y, width, height });
    y -= 4;
  } else {
    text(
      unterschrift.vorhanden
        ? "Unterschrift liegt vor, kann im PDF aber nicht dargestellt werden."
        : "Keine Unterschrift hinterlegt.",
      { farbe: GRAU },
    );
  }
  text(`Durchgefuehrt am ${dateFmt.format(report.durchgefuehrtAm)}.`, { groesse: 8, farbe: GRAU });

  // Fusszeile auf jeder Seite
  const seiten = pdf.getPages();
  const fuss = umbrechen(sauber(`Serviceprotokoll ${daten.anlage} - ${daten.kunde}`), normal, 8, BREITE - 80)[0];
  seiten.forEach((s, index) => {
    const nummer = `Seite ${index + 1} von ${seiten.length}`;
    s.drawText(fuss, { x: RAND, y: RAND - 10, size: 8, font: normal, color: GRAU });
    s.drawText(nummer, {
      x: RAND + BREITE - normal.widthOfTextAtSize(nummer, 8),
      y: RAND - 10,
      size: 8,
      font: normal,
      color: GRAU,
    });
  });

  return pdf.save();
}
