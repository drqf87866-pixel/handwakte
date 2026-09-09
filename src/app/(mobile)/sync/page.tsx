import type { Metadata } from "next";

import { SyncListe } from "@/components/mobile/sync-liste";

export const metadata: Metadata = { title: "Sync" };
export const dynamic = "force-dynamic";

/**
 * Outbox-Uebersicht des Monteurs. Der Session-Guard kommt aus dem
 * (mobile)-Layout; die Eintraege selbst liegen in IndexedDB und werden von
 * der Client-Komponente geladen (der Server sieht die Outbox nicht).
 */
export default function SyncPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Synchronisierung</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Offline Erfasstes einspielen, sobald Empfang besteht.
        </p>
      </div>
      <SyncListe />
    </div>
  );
}
