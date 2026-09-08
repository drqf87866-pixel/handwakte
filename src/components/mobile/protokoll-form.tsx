"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { CameraCapture } from "@/components/mobile/camera-capture";
import { SignaturePad } from "@/components/mobile/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState, type ActionState } from "@/lib/actions";
import type { UploadResult } from "@/types";

export type ProtokollFormProps = {
  /** In der Server-Komponente uebergebene Server Action (nicht im Client binden). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  jobId: string | null;
  installationId: string | null;
};

type UploadAntwort = UploadResult & { error?: string };

/**
 * Protokollformular des Monteurs: Messwerte, Taetigkeiten, Fotos, Unterschrift.
 *
 * Fotos und Unterschrift werden sofort per /api/upload nach R2 gelegt (der
 * Keller hat nicht unbedingt beim Abschliessen noch Empfang). Ihre IDs sammelt
 * das Formular und die Server Action verknuepft sie mit dem neuen Report.
 */
export function ProtokollForm({ action, jobId, installationId }: ProtokollFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [fotoIds, setFotoIds] = useState<string[]>([]);
  const [signaturIds, setSignaturIds] = useState<string[]>([]);
  const [signaturPending, setSignaturPending] = useState(false);

  if (!installationId) {
    return (
      <Card size="sm">
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Keine Anlage gewählt. Bitte zuerst den QR-Code an der Anlage scannen.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function signaturHochladen(blob: Blob) {
    const body = new FormData();
    body.set("file", new File([blob], "unterschrift.png", { type: "image/png" }));
    body.set("installationId", installationId!);
    body.set("art", "signatur");

    setSignaturPending(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as UploadAntwort;
      if (!response.ok) throw new Error(data.error ?? "Unterschrift konnte nicht gespeichert werden");

      setSignaturIds((prev) => [...prev, data.id]);
      toast.success("Unterschrift übernommen – wird mit dem Protokoll gespeichert");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unterschrift konnte nicht gespeichert werden");
    } finally {
      setSignaturPending(false);
    }
  }

  const fehler = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId ?? ""} />
      <input type="hidden" name="installationId" value={installationId} />
      <input type="hidden" name="attachmentIds" value={[...fotoIds, ...signaturIds].join(",")} />

      {state.message && !state.ok ? (
        <p className="text-destructive text-sm" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messwerte</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="abgastemperatur">Abgastemp. (&deg;C)</Label>
            <Input id="abgastemperatur" name="abgastemperatur" inputMode="decimal" />
            {fehler.abgastemperatur ? (
              <p className="text-destructive text-xs">{fehler.abgastemperatur}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="co2">CO&#8322; (%)</Label>
            <Input id="co2" name="co2" inputMode="decimal" />
            {fehler.co2 ? <p className="text-destructive text-xs">{fehler.co2}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="druck">Druck (bar)</Label>
            <Input id="druck" name="druck" inputMode="decimal" />
            {fehler.druck ? <p className="text-destructive text-xs">{fehler.druck}</p> : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arbeitszeit">Arbeitszeit (min)</Label>
            <Input id="arbeitszeit" name="arbeitszeit" inputMode="numeric" />
            {fehler.arbeitszeit ? (
              <p className="text-destructive text-xs">{fehler.arbeitszeit}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tätigkeiten &amp; Mängel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="taetigkeiten">Durchgeführte Tätigkeiten</Label>
            <Textarea
              id="taetigkeiten"
              name="taetigkeiten"
              rows={3}
              placeholder="z. B. Brenner gereinigt, Filter getauscht"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maengel">Festgestellte Mängel</Label>
            <Textarea
              id="maengel"
              name="maengel"
              rows={3}
              placeholder="Leer lassen, wenn keine Mängel vorliegen"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fotos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CameraCapture
            installationId={installationId}
            onUploaded={(file) => setFotoIds((prev) => [...prev, file.id])}
          />
          {fotoIds.length > 0 ? (
            <p className="text-muted-foreground text-xs" aria-live="polite">
              {fotoIds.length} {fotoIds.length === 1 ? "Foto" : "Fotos"} zugeordnet
            </p>
          ) : null}
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
          {signaturPending ? (
            <p className="text-muted-foreground text-xs">Unterschrift wird hochgeladen …</p>
          ) : signaturIds.length > 0 ? (
            <p className="text-muted-foreground text-xs" aria-live="polite">
              Unterschrift übernommen
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={pending || signaturPending}>
        {pending ? "Wird gespeichert …" : "Protokoll abschließen"}
      </Button>
    </form>
  );
}
