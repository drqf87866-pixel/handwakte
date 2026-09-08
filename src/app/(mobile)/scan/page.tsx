"use client";

import { useRouter } from "next/navigation";

import { QrScanner } from "@/components/mobile/qr-scanner";

export default function ScanPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Anlage scannen</h1>
        <p className="text-muted-foreground text-sm">
          QR-Code am Kessel scannen, um die Bauakte zu oeffnen.
        </p>
      </div>

      <QrScanner onResult={(qrToken) => router.push(`/anlage/${encodeURIComponent(qrToken)}`)} />
    </div>
  );
}
