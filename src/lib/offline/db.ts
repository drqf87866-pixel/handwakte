/**
 * Offline-Outbox in IndexedDB (keine Dependency, nur die Browser-API).
 *
 * Zwei Stores: `fotos` haelt aufgenommene Bilder als Blob (komprimiert, siehe
 * offline/bilder.ts), `protokolle` haelt abgeschlossene, aber noch nicht
 * synchronisierte Protokoll-Payloads samt Verweisen auf ihre Fotos.
 * /sync spielt beides ein, sobald wieder Empfang besteht.
 *
 * Blob-Support in IndexedDB koennen alle Zielbrowser (Chrome/Edge Android,
 * Safari iPhone). Groesse: Dank Komprimierung liegt ein Foto bei 200-500 KB.
 */

export type OfflineFotoStatus = "pending" | "hochgeladen" | "fehler";

export type OfflineFoto = {
  id: string;
  installationId: string;
  /** Gesetz beim Offline-Abschliessen, null = Einzelfoto aus der Bauakte. */
  protokollId: string | null;
  art: "foto" | "signatur";
  blob: Blob;
  dateiname: string;
  erstelltAm: number;
  status: OfflineFotoStatus;
  /** Nach dem Upload gesetzt, dann verweist das Protokoll darauf. */
  attachmentId: string | null;
  fehler: string | null;
};

export type OfflineProtokollStatus = "pending" | "syncing" | "done" | "fehler";

export type OfflineProtokollDaten = {
  jobId: string | null;
  installationId: string;
  abgastemperatur: number | null;
  co2: number | null;
  druck: number | null;
  arbeitszeit: number | null;
  taetigkeiten: string | null;
  maengel: string | null;
  unterschriftName: string | null;
};

export type OfflineProtokoll = {
  id: string;
  daten: OfflineProtokollDaten;
  /** Anzeigename fuer /sync (offline keine DB-Abfrage moeglich). */
  anlageName: string | null;
  /** Lokale Foto-IDs (pending oder bereits hochgeladen). */
  fotoIds: string[];
  erstelltAm: number;
  status: OfflineProtokollStatus;
  fehler: string | null;
};

const DB_NAME = "bauakte-offline";
const DB_VERSION = 1;

/** UI ueber Aenderungen informieren (Badge, /sync-Liste). */
export function meldeOutboxAenderung() {
  window.dispatchEvent(new CustomEvent("bauakte:outbox"));
}

function datenbankOeffnen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB wird nicht unterstuetzt"));
      return;
    }

    const anfrage = indexedDB.open(DB_NAME, DB_VERSION);

    anfrage.onupgradeneeded = () => {
      const db = anfrage.result;
      if (!db.objectStoreNames.contains("fotos")) {
        const fotos = db.createObjectStore("fotos", { keyPath: "id" });
        fotos.createIndex("protokollId", "protokollId", { unique: false });
        fotos.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("protokolle")) {
        const protokolle = db.createObjectStore("protokolle", { keyPath: "id" });
        protokolle.createIndex("status", "status", { unique: false });
      }
    };

    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error ?? new Error("IndexedDB oeffnen fehlgeschlagen"));
  });
}

function anfrage<T>(arbeit: (db: IDBDatabase) => IDBRequest<T>): Promise<T> {
  return datenbankOeffnen().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = arbeit(db);
        req.onsuccess = () => {
          db.close();
          resolve(req.result);
        };
        req.onerror = () => {
          db.close();
          reject(req.error ?? new Error("IndexedDB-Anfrage fehlgeschlagen"));
        };
      }),
  );
}

function alleLesen<T>(store: "fotos" | "protokolle"): Promise<T[]> {
  return anfrage<T[]>((db) =>
    db.transaction(store, "readonly").objectStore(store).getAll(),
  );
}

/* Fotos */

export async function fotoAblegen(
  eintrag: Pick<OfflineFoto, "installationId" | "art" | "blob" | "dateiname">,
): Promise<string> {
  // Prefix "lokal-" trennt Outbox-IDs von Server-UUIDs (Sync-Abgleich).
  const id = `lokal-${crypto.randomUUID()}`;
  const voll: OfflineFoto = {
    ...eintrag,
    id,
    protokollId: null,
    erstelltAm: Date.now(),
    status: "pending",
    attachmentId: null,
    fehler: null,
  };
  await anfrage((db) => db.transaction("fotos", "readwrite").objectStore("fotos").put(voll));
  meldeOutboxAenderung();
  return id;
}

export async function fotoLesen(id: string): Promise<OfflineFoto | undefined> {
  return anfrage<OfflineFoto | undefined>((db) =>
    db.transaction("fotos", "readonly").objectStore("fotos").get(id),
  );
}

export async function fotosZuProtokoll(protokollId: string): Promise<OfflineFoto[]> {
  const alle = await alleLesen<OfflineFoto>("fotos");
  return alle.filter((f) => f.protokollId === protokollId);
}

/** Einzelfotos aus der Bauakte: noch keinem Protokoll zugeordnet. */
export async function einzelneFotos(): Promise<OfflineFoto[]> {
  const alle = await alleLesen<OfflineFoto>("fotos");
  return alle
    .filter((f) => f.protokollId === null && f.status !== "hochgeladen")
    .sort((a, b) => a.erstelltAm - b.erstelltAm);
}

export async function fotoAktualisieren(
  id: string,
  patch: Partial<Pick<OfflineFoto, "protokollId" | "status" | "attachmentId" | "fehler">>,
): Promise<void> {
  const foto = await fotoLesen(id);
  if (!foto) return;
  const naechstes = { ...foto, ...patch };
  await anfrage((db) => db.transaction("fotos", "readwrite").objectStore("fotos").put(naechstes));
  meldeOutboxAenderung();
}

export async function fotoLoeschen(id: string): Promise<void> {
  await anfrage((db) => db.transaction("fotos", "readwrite").objectStore("fotos").delete(id));
  meldeOutboxAenderung();
}

/* Protokolle */

export async function protokollAblegen(
  eintrag: Pick<OfflineProtokoll, "daten" | "anlageName" | "fotoIds">,
): Promise<string> {
  const id = `protokoll-${crypto.randomUUID()}`;
  const voll: OfflineProtokoll = {
    ...eintrag,
    id,
    erstelltAm: Date.now(),
    status: "pending",
    fehler: null,
  };
  await anfrage((db) =>
    db.transaction("protokolle", "readwrite").objectStore("protokolle").put(voll),
  );

  // Fotos an dieses Protokoll binden (Einzelfotos bleiben ungebunden).
  for (const fotoId of eintrag.fotoIds) {
    await fotoAktualisieren(fotoId, { protokollId: id });
  }

  meldeOutboxAenderung();
  return id;
}

export async function offeneProtokolle(): Promise<OfflineProtokoll[]> {
  const alle = await alleLesen<OfflineProtokoll>("protokolle");
  return alle
    .filter((p) => p.status === "pending" || p.status === "fehler" || p.status === "syncing")
    .sort((a, b) => a.erstelltAm - b.erstelltAm);
}

export async function protokollLesen(id: string): Promise<OfflineProtokoll | undefined> {
  return anfrage<OfflineProtokoll | undefined>((db) =>
    db.transaction("protokolle", "readonly").objectStore("protokolle").get(id),
  );
}

export async function protokollAktualisieren(
  id: string,
  patch: Partial<Pick<OfflineProtokoll, "status" | "fehler">>,
): Promise<void> {
  const gefunden = await protokollLesen(id);
  if (!gefunden) return;
  const naechstes = { ...gefunden, ...patch };
  await anfrage((db) =>
    db.transaction("protokolle", "readwrite").objectStore("protokolle").put(naechstes),
  );
  meldeOutboxAenderung();
}

export async function protokollLoeschen(id: string): Promise<void> {
  await anfrage((db) =>
    db.transaction("protokolle", "readwrite").objectStore("protokolle").delete(id),
  );
  meldeOutboxAenderung();
}

/** Anzahl ausstehender Eintraege fuer Badge und Sync-Seite. */
export async function zaehleAusstehend(): Promise<{ protokolle: number; fotos: number }> {
  const [alleProtokolle, alleFotos] = await Promise.all([
    alleLesen<OfflineProtokoll>("protokolle"),
    alleLesen<OfflineFoto>("fotos"),
  ]);

  return {
    protokolle: alleProtokolle.filter((p) => p.status !== "done").length,
    fotos: alleFotos.filter((f) => f.protokollId === null && f.status === "pending").length,
  };
}
