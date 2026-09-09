"use client";

/**
 * Sync-Engine: spielt die IndexedDB-Outbox ein, sobald Netz besteht.
 *
 * Reihenfolge pro Protokoll: erst dessen Blobs ueber /api/upload (Session
 * laeuft uebers Cookie, online also verfuegbar), dann der Abschluss ueber
 * /api/sync/protokoll mit den echten Attachment-IDs. Einzelfotos aus der
 * Bauakte wandern direkt nach R2 und bleiben dort unverknuepft sichtbar.
 *
 * Erfolgreich Eingespieltes wird aus der Outbox geloescht (der Server hat
 * alles); Fehler bleiben mit Meldung stehen und sind per Retry erneut
 * versuchbar. Nichts geht still verloren.
 */
import {
  einzelneFotos,
  fotoAktualisieren,
  fotoLoeschen,
  fotosZuProtokoll,
  offeneProtokolle,
  protokollAktualisieren,
  protokollLoeschen,
  type OfflineFoto,
} from "@/lib/offline/db";
import { dateiHochladen } from "@/lib/offline/upload";

export type SyncBericht = {
  protokolleOk: number;
  fotosOk: number;
  fehler: string[];
};

async function blobEinspielen(foto: OfflineFoto): Promise<string> {
  const body = new FormData();
  body.set("file", new File([foto.blob], foto.dateiname));
  body.set("installationId", foto.installationId);
  body.set("art", foto.art);

  const { id } = await dateiHochladen(body);
  return id;
}

const zahlAlsText = (wert: number | null): string => (wert === null ? "" : String(wert));
const textAlsText = (wert: string | null): string => wert ?? "";

export async function jetztSynchronisieren(): Promise<SyncBericht> {
  const bericht: SyncBericht = { protokolleOk: 0, fotosOk: 0, fehler: [] };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    bericht.fehler.push("Keine Verbindung – später erneut versuchen.");
    return bericht;
  }

  // Einzelfotos aus der Bauakte (keinem Protokoll zugeordnet).
  for (const foto of await einzelneFotos()) {
    try {
      await blobEinspielen(foto);
      await fotoLoeschen(foto.id);
      bericht.fotosOk += 1;
    } catch (error) {
      const meldung = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      await fotoAktualisieren(foto.id, { status: "fehler", fehler: meldung });
      bericht.fehler.push(`Foto: ${meldung}`);
    }
  }

  // Abgeschlossene Protokolle samt ihrer Aufnahmen.
  for (const protokoll of await offeneProtokolle()) {
    await protokollAktualisieren(protokoll.id, { status: "syncing", fehler: null });

    try {
      const fotos = await fotosZuProtokoll(protokoll.id);
      const attachmentIds: string[] = [];

      for (const foto of fotos) {
        if (foto.attachmentId) {
          attachmentIds.push(foto.attachmentId);
          continue;
        }
        const attachmentId = await blobEinspielen(foto);
        await fotoAktualisieren(foto.id, { status: "hochgeladen", attachmentId, fehler: null });
        attachmentIds.push(attachmentId);
      }

      const antwort = await fetch("/api/sync/protokoll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: protokoll.daten.jobId ?? "",
          installationId: protokoll.daten.installationId,
          abgastemperatur: zahlAlsText(protokoll.daten.abgastemperatur),
          co2: zahlAlsText(protokoll.daten.co2),
          druck: zahlAlsText(protokoll.daten.druck),
          arbeitszeit: zahlAlsText(protokoll.daten.arbeitszeit),
          taetigkeiten: textAlsText(protokoll.daten.taetigkeiten),
          maengel: textAlsText(protokoll.daten.maengel),
          empfehlungen: textAlsText(protokoll.daten.empfehlungen),
          unterschriftName: textAlsText(protokoll.daten.unterschriftName),
          attachmentIds,
        }),
      });
      const daten = (await antwort.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!antwort.ok) throw new Error(daten.error ?? daten.message ?? "Sync fehlgeschlagen");

      for (const foto of fotos) await fotoLoeschen(foto.id);
      await protokollLoeschen(protokoll.id);
      bericht.protokolleOk += 1;
    } catch (error) {
      const meldung = error instanceof Error ? error.message : "Sync fehlgeschlagen";
      await protokollAktualisieren(protokoll.id, { status: "fehler", fehler: meldung });
      bericht.fehler.push(`${protokoll.anlageName ?? "Protokoll"}: ${meldung}`);
    }
  }

  return bericht;
}
