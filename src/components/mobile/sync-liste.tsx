"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  einzelneFotos,
  offeneProtokolle,
  type OfflineFoto,
  type OfflineProtokoll,
} from "@/lib/offline/db";
import { jetztSynchronisieren } from "@/lib/offline/sync";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const STATUS_TEXT: Record<OfflineProtokoll["status"], string> = {
  pending: "Wartet",
  syncing: "Wird synchronisiert …",
  done: "Erledigt",
  fehler: "Fehlgeschlagen",
};

/**
 * Outbox-Liste mit Sync-Button. Laedt aus IndexedDB (Server sieht die
 * Outbox nicht) und spielt per Button alles Geparkte ein.
 */
export function SyncListe() {
  const [protokolle, setProtokolle] = useState<OfflineProtokoll[]>([]);
  const [fotos, setFotos] = useState<OfflineFoto[]>([]);
  const [laeuft, setLaeuft] = useState(false);

  const laden = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([offeneProtokolle(), einzelneFotos()]);
      setProtokolle(p);
      setFotos(f);
    } catch {
      // IndexedDB fehlt: Liste bleibt leer, Sync-Button meldet sich dann.
    }
  }, []);

  useEffect(() => {
    // Outbox beim Mounten einmal lesen (danach nur noch per Event) - das ist
    // der dokumentierte Ausnahmefall fuers Datenladen im Effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void laden();
    window.addEventListener("bauakte:outbox", laden);
    return () => window.removeEventListener("bauakte:outbox", laden);
  }, [laden]);

  async function synchronisieren() {
    setLaeuft(true);
    try {
      const bericht = await jetztSynchronisieren();
      await laden();

      const teile: string[] = [];
      if (bericht.protokolleOk > 0) {
        teile.push(`${bericht.protokolleOk} ${bericht.protokolleOk === 1 ? "Protokoll" : "Protokolle"}`);
      }
      if (bericht.fotosOk > 0) {
        teile.push(`${bericht.fotosOk} ${bericht.fotosOk === 1 ? "Foto" : "Fotos"}`);
      }
      if (teile.length > 0) toast.success(`${teile.join(" und ")} synchronisiert`);

      for (const fehler of bericht.fehler) toast.error(fehler);
      if (teile.length === 0 && bericht.fehler.length === 0) {
        toast.info("Nichts zu synchronisieren.");
      }
    } finally {
      setLaeuft(false);
    }
  }

  const leer = protokolle.length === 0 && fotos.length === 0;

  return (
    <div className="space-y-4">
      <Button onClick={synchronisieren} disabled={laeuft || leer} className="w-full" size="lg">
        <RefreshCw className={laeuft ? "animate-spin" : ""} />
        {laeuft ? "Wird synchronisiert …" : "Jetzt synchronisieren"}
      </Button>

      {leer ? (
        <Card size="sm">
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Alles synchronisiert. Offline erfasste Protokolle und Fotos erscheinen hier, sobald
              sie auf Synchronisierung warten.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {protokolle.map((p) => (
        <Card key={p.id} size="sm">
          <CardContent className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{p.anlageName ?? "Protokoll"}</p>
              <Badge variant={p.status === "fehler" ? "destructive" : "secondary"}>
                {STATUS_TEXT[p.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              Erfasst {dateFmt.format(new Date(p.erstelltAm))} · {p.fotoIds.length}{" "}
              {p.fotoIds.length === 1 ? "Aufnahme" : "Aufnahmen"}
            </p>
            {p.fehler ? (
              <p className="text-destructive text-xs" aria-live="polite">
                {p.fehler}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}

      {fotos.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Einzelfotos aus der Bauakte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              {fotos.length} {fotos.length === 1 ? "Foto" : "Fotos"} ohne Protokoll – werden beim
              Synchronisieren der Anlage zugeordnet.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
