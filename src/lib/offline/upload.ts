"use client";

/**
 * Upload-Helfer fuer die Offline-Wege (Client only - nutzt fetch + IndexedDB).
 *
 * `dateiHochladen` ist der duenne fetch-Wrapper um POST /api/upload.
 * `lokaleIdsHochladen` spielt zuvor offline abgelegte Blobs ein und liefert
 * die echten Attachment-IDs zurueck - damit kann das Protokollformular beim
 * Absenden lokale gegen Server-IDs tauschen, statt den Abschluss zu
 * duplizieren.
 */
import { fotoAblegen, fotoAktualisieren, fotoLesen } from "@/lib/offline/db";
import type { UploadResult } from "@/types";

type UploadAntwort = UploadResult & { error?: string };

/** Outbox-ID (Prefix "lokal-") statt Server-UUID? */
export function istLokaleId(id: string): boolean {
  return id.startsWith("lokal-");
}

export async function dateiHochladen(body: FormData): Promise<UploadResult> {
  const response = await fetch("/api/upload", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as UploadAntwort;

  if (!response.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");

  return { id: data.id, key: data.key, url: data.url };
}

/**
 * Foto/Signatur offline ablegen. Gibt ein UploadResult mit lokaler ID und
 * Blob-Vorschau-URL zurueck, damit Aufrufer keinen Sonderweg brauchen.
 */
export async function dateiOfflineAblegen(
  installationId: string,
  art: "foto" | "signatur",
  blob: Blob,
  dateiname: string,
): Promise<UploadResult> {
  const id = await fotoAblegen({ installationId, art, blob, dateiname });
  return { id, key: "", url: URL.createObjectURL(blob) };
}

/**
 * Lokale IDs einspielen. Gibt die Zuordnung lokal -> Server zurueck.
 * Schlaegt ein Upload fehl (Netz wackelt), bricht alles ab - der Aufrufer
 * legt dann das ganze Protokoll offline ab, statt halb zu senden.
 */
export async function lokaleIdsHochladen(
  ids: string[],
): Promise<{ zugeordnet: Map<string, string>; fehler: string | null }> {
  const zugeordnet = new Map<string, string>();

  for (const id of ids) {
    const eintrag = await fotoLesen(id);
    if (!eintrag) return { zugeordnet, fehler: "Offline-Datei nicht mehr gefunden." };

    // Bereits hochgeladen (z.B. Doppelsubmit): ID wiederverwenden.
    if (eintrag.attachmentId) {
      zugeordnet.set(id, eintrag.attachmentId);
      continue;
    }

    const body = new FormData();
    body.set("file", new File([eintrag.blob], eintrag.dateiname));
    body.set("installationId", eintrag.installationId);
    body.set("art", eintrag.art);

    try {
      const { id: attachmentId } = await dateiHochladen(body);
      await fotoAktualisieren(id, { status: "hochgeladen", attachmentId, fehler: null });
      zugeordnet.set(id, attachmentId);
    } catch (error) {
      const meldung = error instanceof Error ? error.message : "Upload fehlgeschlagen";
      await fotoAktualisieren(id, { status: "fehler", fehler: meldung });
      return { zugeordnet, fehler: meldung };
    }
  }

  return { zugeordnet, fehler: null };
}
