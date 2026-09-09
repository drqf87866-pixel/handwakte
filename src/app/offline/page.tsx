import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Offline" };

/**
 * Fehlerseite ohne Netz. Absichtlich ohne Session-Guard: Der Service Worker
 * serviert sie aus dem Cache, gerade wenn keine Anmeldung pruefbar ist.
 * Keine Kundendaten hier - nur Navigation.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <CloudOff className="size-6" />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Keine Verbindung</h1>
      <p className="text-muted-foreground mt-1 text-center text-sm">
        Diese Seite braucht Empfang. Bereits besuchte Bauakten und erfasste Protokolle bleiben
        trotzdem erhalten.
      </p>
      <Card size="sm" className="mt-6 w-full">
        <CardContent className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/scan">Zum Scan (offline lesbar)</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sync">Ausstehende Synchronisierung</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
