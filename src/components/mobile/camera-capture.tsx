"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { UploadResult } from "@/types";

export type CameraCaptureProps = {
  installationId: string;
  reportId?: string;
  /** Wird nach erfolgreichem Upload mit R2-Key und Abruf-URL aufgerufen. */
  onUploaded?: (file: UploadResult) => void;
};

/**
 * Foto aufnehmen und in den R2-Bucket laden.
 *
 * Nutzt `capture="environment"` - auf dem Handy oeffnet das direkt die
 * Ruecckamera, am Desktop den Dateidialog. Der Upload laeuft ueber /api/upload.
 *
 * TODO(Feature-Phase): Vorschau, Mehrfachauswahl, Komprimierung vor dem Upload
 * und eine Offline-Queue fuer den Keller ohne Empfang.
 */
export function CameraCapture({ installationId, reportId, onUploaded }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("installationId", installationId);
    body.set("art", "foto");
    if (reportId) body.set("reportId", reportId);

    setPending(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as UploadResult & { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Upload fehlgeschlagen");

      toast.success("Foto gespeichert");
      onUploaded?.(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload fehlgeschlagen");
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
