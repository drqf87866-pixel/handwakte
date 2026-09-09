"use client";

import { CloudOff } from "lucide-react";

import { useOnlineStatus } from "@/components/shared/offline-hooks";

/**
 * Hinweis ueber Seiten mit moeglichweise altem Stand. Rendert nur ohne Netz -
 * mit Empfang liefert der Server ohnehin frische Daten.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <p
      role="status"
      className="border-amber-500/40 bg-amber-500/10 text-amber-900 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm dark:text-amber-200"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      Offline – Stand vom letzten Besuch. Neue Eingaben werden synchronisiert, sobald Empfang
      besteht.
    </p>
  );
}
