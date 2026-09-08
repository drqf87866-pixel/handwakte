import Link from "next/link";
import { Flame, LayoutDashboard, ScanLine } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Einstieg: Büro geht ins Dashboard, der Monteur direkt in den QR-Scan.
 * Wer nicht angemeldet ist, landet über die Middleware auf /login.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="rounded-3xl border bg-card p-8 text-center shadow-xs">
        <span className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-2xl shadow-xs">
          <Flame className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Digitale Bauakte</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Anlagenverwaltung und automatisierter Wartungsplaner für Heizungsbau &amp; Sanitär.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/scan">
              <ScanLine />
              Anlage scannen
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/dashboard">
              <LayoutDashboard />
              Büro-Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
