"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type QrScannerProps = {
  /** Wird mit dem gelesenen qrToken aufgerufen. */
  onResult: (qrToken: string) => void;
  onError?: (error: Error) => void;
};

/**
 * Platzhalter für den QR-Scanner.
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
      <Card className="border-dashed">
        <CardContent className="text-muted-foreground flex aspect-square flex-col items-center justify-center gap-2 text-center">
          <span className="bg-muted flex size-12 items-center justify-center rounded-2xl">
            <ScanLine className="size-6" />
          </span>
          <p className="text-sm font-medium">Kamera-Vorschau</p>
          <p className="text-xs">folgt in der Feature-Phase</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <Label htmlFor="qr-token">Code vom Aufkleber</Label>
        <Input
          id="qr-token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="z. B. a1b2c3d4"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!token.trim()}>
        Anlage öffnen
      </Button>
    </form>
  );
}
