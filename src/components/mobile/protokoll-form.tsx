"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CameraCapture } from "@/components/mobile/camera-capture";
import { SignaturePad } from "@/components/mobile/signature-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleState, type ActionState } from "@/lib/actions";
import { protokollAblegen } from "@/lib/offline/db";
import {
  dateiHochladen,
  dateiOfflineAblegen,
  istLokaleId,
  lokaleIdsHochladen,
} from "@/lib/offline/upload";

export type ProtokollFormProps = {
  /** In der Server-Komponente uebergebene Server Action (nicht im Client binden). */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  jobId: string | null;
  installationId: string | null;
  /** Anzeigename fuer die Outbox (offline keine DB-Abfrage moeglich). */
  anlageName: string | null;
  /** Ruecksprung nach dem Offline-Abschliessen. */
  qrToken: string | null;
};

function alsDezimalzahl(wert: string): number | null {
  const text = wert.trim();
  if (text === "") return null;
  const zahl = Number(text.replace(",", "."));
  return Number.isFinite(zahl) ? zahl : NaN;
}

/**
 * Protokollformular des Monteurs: Messwerte, Taetigkeiten, Fotos, Unterschrift.
 *
 * Fotos und Unterschrift werden sofort per /api/upload nach R2 gelegt (der
 * Keller hat nicht unbedingt beim Abschliessen noch Empfang). Ihre IDs sammelt
 * das Formular und die Server Action verknuepft sie mit dem neuen Report.
 *
 * Offline-Wege: Aufnahmen landen in der IndexedDB-Outbox (IDs mit "lokal-"-
 * Prefix). Beim Absenden ohne Netz wird das ganze Protokoll client-validiert
 * dort abgelegt und /sync spielt es spaeter ein - gleiche Felder, gleiche
 * Regeln (Komma wird normalisiert), nur zeitversetzt.
 */
export function ProtokollForm({
  action,
  jobId,
  installationId,
  anlageName,
  qrToken,
}: ProtokollFormProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, idleState);
  const [fotoIds, setFotoIds] = useState<string[]>([]);
  const [signaturIds, setSignaturIds] = useState<string[]>([]);
  const [signaturPending, setSignaturPending] = useState(false);
  const [sendePhase, setSendePhase] = useState<string | null>(null);
  const [offlineFehler, setOfflineFehler] = useState<string | null>(null);

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

    // Signatur bleibt PNG (Transparenz) - keine Komprimierung.
    setSignaturPending(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw new TypeError("offline");
      }
      const data = await dateiHochladen(body);
      setSignaturIds((prev) => [...prev, data.id]);
      toast.success("Unterschrift übernommen – wird mit dem Protokoll gespeichert");
    } catch (error) {
      const netzfehler =
        error instanceof TypeError || (error instanceof Error && /failed to fetch/i.test(error.message));

      if (netzfehler) {
        try {
          const lokal = await dateiOfflineAblegen(
            installationId!,
            "signatur",
            blob,
            "unterschrift.png",
          );
          setSignaturIds((prev) => [...prev, lokal.id]);
          toast.success("Offline gespeichert – Sync steht aus");
        } catch {
          toast.error("Unterschrift konnte nicht zwischengespeichert werden");
        }
      } else {
        toast.error(
          error instanceof Error ? error.message : "Unterschrift konnte nicht gespeichert werden",
        );
      }
    } finally {
      setSignaturPending(false);
    }
  }

  /**
   * Protokoll ohne Netz client-validiert in die Outbox legen.
   * Gibt false zurueck, wenn schon die Eingaben ungueltig sind.
   */
  async function offlineAbschliessen(formular: FormData, ids: string[]): Promise<boolean> {
    const abgastemperatur = alsDezimalzahl(String(formular.get("abgastemperatur") ?? ""));
    const co2 = alsDezimalzahl(String(formular.get("co2") ?? ""));
    const druck = alsDezimalzahl(String(formular.get("druck") ?? ""));
    const arbeitzeitText = String(formular.get("arbeitszeit") ?? "").trim();

    if (Number.isNaN(abgastemperatur) || Number.isNaN(co2) || Number.isNaN(druck)) {
      setOfflineFehler("Bitte bei den Messwerten Zahlen eintragen (Komma erlaubt).");
      return false;
    }

    let arbeitszeit: number | null = null;
    if (arbeitzeitText !== "") {
      const minuten = Number(arbeitzeitText);
      if (!Number.isInteger(minuten) || minuten < 1 || minuten > 1440) {
        setOfflineFehler("Arbeitszeit: ganze Minuten zwischen 1 und 1440 erwartet.");
        return false;
      }
      arbeitszeit = minuten;
    }

    const text = (name: string): string | null => {
      const wert = String(formular.get(name) ?? "").trim();
      return wert === "" ? null : wert;
    };

    await protokollAblegen({
      daten: {
        jobId,
        installationId: installationId!,
        abgastemperatur,
        co2,
        druck,
        arbeitszeit,
        taetigkeiten: text("taetigkeiten"),
        maengel: text("maengel"),
        empfehlungen: text("empfehlungen"),
        unterschriftName: text("unterschriftName"),
      },
      anlageName,
      fotoIds: ids.filter(istLokaleId),
    });

    toast.success("Offline gespeichert – wird synchronisiert, sobald Empfang besteht");
    if (qrToken) router.push(`/anlage/${qrToken}`);
    return true;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfflineFehler(null);

    const formular = new FormData(event.currentTarget);
    const ids = String(formular.get("attachmentIds") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const lokale = ids.filter(istLokaleId);

    // Kein Netz: alles in die Outbox (auch ohne Anhaenge - reine Formulardaten).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await offlineAbschliessen(formular, ids);
      return;
    }

    // Netz da, aber Aufnahmen stammen aus der Offline-Zeit: erst einspielen,
    // dann normal abschliessen. Wackelt das Netz, sicherheitshalber ablegen.
    if (lokale.length > 0) {
      setSendePhase("Aufnahmen werden hochgeladen …");
      try {
        const { zugeordnet, fehler } = await lokaleIdsHochladen(lokale);
        if (fehler) {
          await offlineAbschliessen(formular, ids);
          return;
        }
        formular.set(
          "attachmentIds",
          ids.map((id) => zugeordnet.get(id) ?? id).join(","),
        );
      } finally {
        setSendePhase(null);
      }
    }

    formAction(formular);
  }

  const fehler = state.fieldErrors ?? {};
  const kopfFehler = (!state.ok && state.message) || offlineFehler;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="jobId" value={jobId ?? ""} />
      <input type="hidden" name="installationId" value={installationId} />
      <input type="hidden" name="attachmentIds" value={[...fotoIds, ...signaturIds].join(",")} />

      {kopfFehler ? (
        <p className="text-destructive text-sm" aria-live="polite">
          {kopfFehler}
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="empfehlungen">Empfehlungen</Label>
            <Textarea
              id="empfehlungen"
              name="empfehlungen"
              rows={3}
              placeholder="z. B. Filter naechstes Mal tauschen, Angebot folgt"
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

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || signaturPending || sendePhase !== null}
      >
        {sendePhase ?? (pending ? "Wird gespeichert …" : "Protokoll abschließen")}
      </Button>
    </form>
  );
}
