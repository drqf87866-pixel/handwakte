"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type QrScannerProps = {
  /** Wird mit dem gelesenen qrToken aufgerufen. */
  onResult: (qrToken: string) => void;
  onError?: (error: Error) => void;
};

/**
 * Platzhalter fuer den QR-Scanner.
 *
 * TODO(Feature-Phase): Kamera per BarcodeDetector API (Chrome/Android) mit
 * Fallback auf eine WASM-Bibliothek anbinden. Bis dahin kann der Token vom
 * Aufkleber abgetippt werden, damit der Flow bereits testbar ist.
 */
export function QrScanner({ onResult }: QrScannerProps) {
  const [token, setToken] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (token.trim()) onResult(token.trim());
      }}
    >
      <div className="text-muted-foreground flex aspect-square items-center justify-center rounded-lg border border-dashed text-center text-sm">
        Kamera-Vorschau
        <br />
        (folgt in der Feature-Phase)
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="qr-token">Code vom Aufkleber</Label>
        <Input
          id="qr-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="z.B. a1b2c3d4"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <Button type="submit" className="w-full" disabled={!token.trim()}>
        Anlage oeffnen
      </Button>
    </form>
  );
}
