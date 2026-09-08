"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import jsQR from "jsqr";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type QrScannerProps = {
  /** Wird mit dem gelesenen qrToken aufgerufen. */
  onResult: (qrToken: string) => void;
  onError?: (error: Error) => void;
};

type ScanStatus = "bereit" | "kamera" | "fehler";

/** Minimaler Ausschnitt der nativen BarcodeDetector-API (Chrome/Edge/Android). */
type Detektor = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
};

function erzeugeDetektor(): Detektor | null {
  const fenster = window as unknown as {
    BarcodeDetector?: new (optionen?: { formats?: string[] }) => Detektor;
  };
  if (typeof fenster.BarcodeDetector === "undefined") return null;
  try {
    return new fenster.BarcodeDetector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

/**
 * Der Aufkleber enthaelt die volle URL (`.../anlage/<token>`), von Hand wird
 * der reine Token eingetippt. Beides auf den Token normalisieren; fremde
 * QR-Codes (WLAN, Links, ...) ablehnen statt falsch abzubiegen.
 */
function extrahiereToken(text: string): string | null {
  const nah = text.trim();
  if (!nah) return null;

  const ausUrl = nah.match(/\/anlage\/([A-Za-z0-9_-]+)/);
  if (ausUrl) return ausUrl[1];

  if (/^[A-Za-z0-9_-]{4,64}$/.test(nah)) return nah;
  return null;
}

async function kameraOeffnen(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
  } catch {
    // Geraete ohne Rueckkamera (Desktop) scheitern an facingMode - dann jede
    // verfuegbare Kamera nehmen.
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  }
}

/**
 * Live-QR-Scanner: Kamera via getUserMedia, Erkennung nativ per
 * BarcodeDetector (Chrome/Edge/Android) mit jsQR-Fallback (Safari/iPhone).
 * Die manuelle Token-Eingabe bleibt als Ausweg erhalten.
 */
export function QrScanner({ onResult, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervallRef = useRef<number | null>(null);
  const fertigRef = useRef(false);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const [status, setStatus] = useState<ScanStatus>("bereit");
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [token, setToken] = useState("");

  function aufraeumen() {
    if (intervallRef.current !== null) {
      window.clearInterval(intervallRef.current);
      intervallRef.current = null;
    }
    streamRef.current?.getTracks().forEach((spur) => spur.stop());
    streamRef.current = null;
  }

  useEffect(() => aufraeumen, []);

  function meldeFehler(text: string, ursache?: unknown) {
    setStatus("fehler");
    setHinweis(text);
    aufraeumen();
    if (ursache instanceof Error) onError?.(ursache);
    else if (ursache !== undefined) onError?.(new Error(text));
  }

  function erfolg(rohtext: string) {
    if (fertigRef.current) return;

    // Fremde QR-Codes (WLAN, Links, ...) still ignorieren und weitersuchen.
    const qrToken = extrahiereToken(rohtext);
    if (!qrToken) return;

    fertigRef.current = true;
    aufraeumen();
    onResultRef.current(qrToken);
  }

  async function starten() {
    if (!navigator.mediaDevices?.getUserMedia) {
      meldeFehler("Kamera nicht verfügbar - die Seite braucht HTTPS oder localhost.");
      return;
    }

    fertigRef.current = false;
    setHinweis(null);

    let stream: MediaStream;
    try {
      stream = await kameraOeffnen();
    } catch (error) {
      meldeFehler(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Kamera-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben oder den Code unten eintippen."
          : "Keine Kamera gefunden. Bitte den Code unten eintippen.",
        error,
      );
      return;
    }

    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((spur) => spur.stop());
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    try {
      await video.play();
    } catch (error) {
      meldeFehler("Kamera-Vorschau konnte nicht starten.", error);
      return;
    }

    setStatus("kamera");
    const detektor = erzeugeDetektor();
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");

    intervallRef.current = window.setInterval(async () => {
      if (fertigRef.current || !videoRef.current) return;
      const bild = videoRef.current;
      if (bild.readyState < 2 || bild.videoWidth === 0) return;

      try {
        if (detektor) {
          const treffer = await detektor.detect(bild);
          if (treffer.length > 0 && treffer[0].rawValue) {
            erfolg(treffer[0].rawValue);
            return;
          }
        } else {
          // Fallback fuer Safari/iPhone: jsQR auf dem Kamerabild.
          const leinwand = canvasRef.current!;
          const breite = Math.min(bild.videoWidth, 960);
          const hoehe = Math.round((breite / bild.videoWidth) * bild.videoHeight);
          leinwand.width = breite;
          leinwand.height = hoehe;
          const ctx = leinwand.getContext("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(bild, 0, 0, breite, hoehe);
          const daten = ctx.getImageData(0, 0, breite, hoehe);
          const code = jsQR(daten.data, daten.width, daten.height);
          if (code?.data) erfolg(code.data);
        }
      } catch {
        // Ein einzelner Fehlversuch darf die Schleife nicht beenden.
      }
    }, 350);
  }

  return (
    <div className="space-y-4">
      {status === "kamera" ? (
        <Card className="overflow-hidden py-0">
          <CardContent className="relative p-0">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[4/3] w-full bg-black object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="border-primary size-48 rounded-2xl border-4 opacity-80" />
            </div>
            <p className="bg-background/90 absolute inset-x-0 bottom-0 py-2 text-center text-xs">
              Code ins Bild halten …
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground flex aspect-[4/3] flex-col items-center justify-center gap-2 text-center">
            <video ref={videoRef} playsInline muted className="hidden" />
            <span className="bg-muted flex size-12 items-center justify-center rounded-2xl">
              <ScanLine className="size-6" />
            </span>
            <p className="text-sm font-medium">Kamera-Scan</p>
            {hinweis ? (
              <p className="max-w-60 text-xs" role="alert">
                {hinweis}
              </p>
            ) : (
              <p className="max-w-60 text-xs">QR-Code an der Anlage scannen</p>
            )}
            <Button type="button" className="mt-2" onClick={starten}>
              <Camera />
              Kamera starten
            </Button>
          </CardContent>
        </Card>
      )}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const qrToken = extrahiereToken(token);
          if (qrToken) {
            fertigRef.current = true;
            aufraeumen();
            onResult(qrToken);
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="qr-token">Oder Code vom Aufkleber eintippen</Label>
          <Input
            id="qr-token"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="z. B. a1b2c3d4"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={!extrahiereToken(token)}>
          Anlage öffnen
        </Button>
      </form>
    </div>
  );
}
