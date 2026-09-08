"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export type SignaturePadProps = {
  /** Liefert die Unterschrift als PNG - der Aufrufer laedt sie nach R2. */
  onSign: (blob: Blob) => void | Promise<void>;
  height?: number;
};

/**
 * Unterschriften-Feld auf einem Canvas, bedient per Pointer Events (Finger,
 * Stift und Maus in einem).
 *
 * TODO(Feature-Phase): Strichglaettung, devicePixelRatio-Skalierung fuer
 * scharfe Linien auf Retina-Displays und Undo.
 */
export function SignaturePad({ onSign, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [leer, setLeer] = useState(true);

  function context() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = context();
    if (!ctx) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    setLeer(false);

    const { x, y } = position(event);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = context();
    if (!ctx) return;

    const { x, y } = position(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function leeren() {
    const canvas = canvasRef.current;
    const ctx = context();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLeer(true);
  }

  async function uebernehmen() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) await onSign(blob);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="bg-background w-full touch-none rounded-md border"
        style={{ height }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={leeren}>
          Loeschen
        </Button>
        <Button type="button" className="flex-1" disabled={leer} onClick={uebernehmen}>
          Uebernehmen
        </Button>
      </div>
    </div>
  );
}
