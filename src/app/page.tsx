import Link from "next/link";
import { LayoutDashboard, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Einstieg: Buero geht ins Dashboard, der Monteur direkt in den QR-Scan.
 * Wer nicht angemeldet ist, landet ueber die Middleware auf /login.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Digitale Bauakte</h1>
        <p className="text-muted-foreground text-sm">
          Anlagenverwaltung und automatisierter Wartungsplaner fuer Heizungsbau &amp; Sanitaer.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild size="lg">
          <Link href="/scan">
            <ScanLine />
            Anlage scannen
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/dashboard">
            <LayoutDashboard />
            Buero-Dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
