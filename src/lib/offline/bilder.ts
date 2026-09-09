/**
 * Client-seitige Fotokomprimierung vor IndexedDB und Upload.
 *
 * Handyfotos (3-8 MB) wuerden die Outbox sprengen und im Keller ewig zum
 * Hochladen brauchen. 1600 px lange Kante als JPEG reicht fuer Typenschilder
 * und Maengel voellig. HEIC und andere Exoten, die der Browser nicht dekodiert,
 * fallen aufs Original zurueck.
 */

export type Komprimiert = {
  blob: Blob;
  /** False heisst: Original unveraendert (klein genug oder nicht dekodierbar). */
  komprimiert: boolean;
};

const MAX_KANTE = 1600;
const QUALITAET = 0.8;

function canvasAlsBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", QUALITAET));
}

/**
 * Foto auf MAX_KANTE herunterrechnen und als JPEG verpacken. Gibt bei
 * beliebigem Fehler das Original zurueck - lieber gross als verloren.
 */
export async function fotoKomprimieren(datei: Blob): Promise<Komprimiert> {
  const original: Komprimiert = { blob: datei, komprimiert: false };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(datei);
  } catch {
    return original;
  }

  try {
    const laengste = Math.max(bitmap.width, bitmap.height);
    if (laengste <= MAX_KANTE && (datei.type === "image/jpeg" || datei.type === "image/webp")) {
      return original;
    }

    const faktor = Math.min(1, MAX_KANTE / laengste);
    const breite = Math.max(1, Math.round(bitmap.width * faktor));
    const hoehe = Math.max(1, Math.round(bitmap.height * faktor));

    const canvas = document.createElement("canvas");
    canvas.width = breite;
    canvas.height = hoehe;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, breite, hoehe);

    const komprimiert = await canvasAlsBlob(canvas);
    if (!komprimiert || komprimiert.size >= datei.size) return original;

    return { blob: komprimiert, komprimiert: true };
  } catch {
    return original;
  } finally {
    bitmap.close();
  }
}
