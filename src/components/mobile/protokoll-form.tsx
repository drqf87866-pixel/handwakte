"use client";

import { toast } from "sonner";

import { CameraCapture } from "@/components/mobile/camera-capture";
import { SignaturePad } from "@/components/mobile/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type ProtokollFormProps = {
  jobId: string | null;
  installationId: string | null;
};

/**
 * Geruest des Protokolls: Messwerte, Fotos, Unterschrift.
 *
 * TODO(Feature-Phase): Absenden an eine Server Action, die den
 * service_report-Datensatz schreibt, den Auftrag auf "erledigt" setzt,
 * naechsteWartungAm fortschreibt und die Bestaetigungsmail ausloest.
 */
export function ProtokollForm({ jobId, installationId }: ProtokollFormProps) {
  if (!installationId) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Keine Anlage gewaehlt. Bitte zuerst den QR-Code an der Anlage scannen.
      </p>
    );
  }

  async function signaturHochladen(blob: Blob) {
    const body = new FormData();
    body.set("file", new File([blob], "unterschrift.png", { type: "image/png" }));
    body.set("installationId", installationId!);
    body.set("art", "signatur");

    const response = await fetch("/api/upload", { method: "POST", body });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error ?? "Unterschrift konnte nicht gespeichert werden");
      return;
    }

    toast.success("Unterschrift gespeichert");
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        toast.info("Speichern folgt in der Feature-Phase");
      }}
    >
      <input type="hidden" name="jobId" value={jobId ?? ""} />
      <input type="hidden" name="installationId" value={installationId} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messwerte</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="abgastemperatur">Abgastemp. (&deg;C)</Label>
            <Input id="abgastemperatur" name="abgastemperatur" inputMode="decimal" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="co2">CO&#8322; (%)</Label>
            <Input id="co2" name="co2" inputMode="decimal" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="druck">Druck (bar)</Label>
            <Input id="druck" name="druck" inputMode="decimal" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arbeitszeit">Arbeitszeit (min)</Label>
            <Input id="arbeitszeit" name="arbeitszeit" inputMode="numeric" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <CameraCapture installationId={installationId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unterschrift Kunde</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="unterschriftName">Name</Label>
            <Input id="unterschriftName" name="unterschriftName" autoComplete="name" />
          </div>
          <SignaturePad onSign={signaturHochladen} />
        </CardContent>
      </Card>

      <Button type="submit" className="w-full">
        Protokoll abschliessen
      </Button>
    </form>
  );
}
