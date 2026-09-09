"use client";

import { useEffect, useState } from "react";

import { zaehleAusstehend } from "@/lib/offline/db";

/** true, sobald der Browser wieder Netz meldet (Startwert: navigator.onLine). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const an = () => setOnline(true);
    const aus = () => setOnline(false);
    window.addEventListener("online", an);
    window.addEventListener("offline", aus);
    return () => {
      window.removeEventListener("online", an);
      window.removeEventListener("offline", aus);
    };
  }, []);

  return online;
}

export type Ausstehend = { protokolle: number; fotos: number; gesamt: number };

/**
 * Anzahl ausstehender Outbox-Eintraege fuer Badge und Sync-Seite.
 *
 * Aktualisiert sich bei Outbox-Aenderungen, Netzwechseln und alle 30 Sekunden
 * (falls ein anderer Tab synchronisiert hat).
 */
export function useAusstehendAnzahl(): Ausstehend {
  const [stand, setStand] = useState<Ausstehend>({ protokolle: 0, fotos: 0, gesamt: 0 });

  useEffect(() => {
    let aktiv = true;

    async function laden() {
      try {
        const { protokolle, fotos } = await zaehleAusstehend();
        if (aktiv) setStand({ protokolle, fotos, gesamt: protokolle + fotos });
      } catch {
        // IndexedDB fehlt (privater Modus o.a.): Zaehlung bleibt null.
      }
    }

    void laden();
    const intervall = window.setInterval(laden, 30_000);
    window.addEventListener("bauakte:outbox", laden);
    window.addEventListener("online", laden);

    return () => {
      aktiv = false;
      window.clearInterval(intervall);
      window.removeEventListener("bauakte:outbox", laden);
      window.removeEventListener("online", laden);
    };
  }, []);

  return stand;
}
