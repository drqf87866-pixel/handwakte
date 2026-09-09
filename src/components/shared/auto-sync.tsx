"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { zaehleAusstehend } from "@/lib/offline/db";
import { jetztSynchronisieren } from "@/lib/offline/sync";

/**
 * Stilller Auto-Sync: Sobald Netz besteht und die Outbox etwas enthaelt,
 * wird synchronisiert - beim Laden und bei jedem `online`-Event.
 *
 * Ersetzt kein Background Sync (gibt es auf iPhones nicht), sondern ergaenzt
 * den Sync-Button: Wer die App mit Empfang oeffnet, muss an nichts denken.
 * Laeuft in beiden Layouts, damit auch auf einem Buero-Geraet nichts liegen bleibt.
 */
export function AutoSync() {
  const laeuft = useRef(false);

  useEffect(() => {
    async function versuch() {
      if (laeuft.current || !navigator.onLine) return;

      let anzahl = 0;
      try {
        const stand = await zaehleAusstehend();
        anzahl = stand.protokolle + stand.fotos;
      } catch {
        return;
      }
      if (anzahl === 0) return;

      laeuft.current = true;
      try {
        const bericht = await jetztSynchronisieren();
        const erledigt = bericht.protokolleOk + bericht.fotosOk;
        if (erledigt > 0) {
          toast.success(
            `${erledigt} ${erledigt === 1 ? "Eintrag" : "Einträge"} automatisch synchronisiert`,
          );
        }
        for (const fehler of bericht.fehler) toast.error(fehler);
      } finally {
        laeuft.current = false;
      }
    }

    // Kurz warten: Erst Hydration + Session-Cookie, dann Sync.
    const timer = window.setTimeout(versuch, 2000);
    window.addEventListener("online", versuch);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", versuch);
    };
  }, []);

  return null;
}
