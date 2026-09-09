"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { fotoKomprimieren } from "@/lib/offline/bilder";
import { dateiHochladen, dateiOfflineAblegen } from "@/lib/offline/upload";
import type { UploadResult } from "@/types";

export type CameraCaptureProps = {
  installationId: string;
  reportId?: string;
  /** Wird nach erfolgreichem Upload (oder Offline-Ablage) aufgerufen. */
  onUploaded?: (file: UploadResult) => void;
};

/**
 * Foto aufnehmen und in den R2-Bucket laden.
 *
 * Nutzt `capture="environment"` - auf dem Handy oeffnet das direkt die
 * Rueckkamera, am Desktop den Dateidialog. Vor Upload oder Ablage wird
 * komprimiert (1600 px, JPEG), damit Outbox und Keller-Upload schlank bleiben.
 *
 * Ohne Empfang landet das Foto in der IndexedDB-Outbox (ID mit "lokal-"-
 * Prefix, Blob-Vorschau als URL). /sync spielt es spaeter ueber dieselbe
 * /api/upload-Route ein - der Aufrufer braucht keinen Sonderweg.
 *
 * TODO(Feature-Phase): Vorschau, Mehrfachauswahl.
 */
export function CameraCapture({ installationId, reportId, onUploaded }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function upload(file: File) {
    const { blob } = await fotoKomprimieren(file);
    const dateiname = file.name || "foto.jpg";

    setPending(true);
    try {
      // Offline? Dann gar nicht erst fetchen - direkt in die Outbox.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new TypeError("offline");
      }

      const body = new FormData();
      body.set("file", new File([blob], dateiname, { type: blob.type || file.type }));
      body.set("installationId", installationId);
      body.set("art", "foto");
      if (reportId) body.set("reportId", reportId);

      const data = await dateiHochladen(body);
      toast.success("Foto gespeichert");
      onUploaded?.(data);
    } catch (error) {
      // Nur Netzfehler parken - Serverfehler (Typ, Groesse) meldet der Upload.
      const netzfehler =
        error instanceof TypeError || (error instanceof Error && /failed to fetch/i.test(error.message));

      if (netzfehler) {
        try {
          const lokal = await dateiOfflineAblegen(installationId, "foto", blob, dateiname);
          toast.success("Offline gespeichert – Sync steht aus");
          onUploaded?.(lokal);
        } catch {
          toast.error("Foto konnte nicht zwischengespeichert werden");
        }
      } else {
        toast.error(error instanceof Error ? error.message : "Upload fehlgeschlagen");
      }
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Camera />
        {pending ? "Wird hochgeladen …" : "Foto aufnehmen"}
      </Button>
    </>
  );
}
