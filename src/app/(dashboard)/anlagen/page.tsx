import type { Metadata } from "next";

export const metadata: Metadata = { title: "Anlagen" };

export default function AnlagenPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Anlagen</h1>
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Platzhalter. Liest spaeter die Tabelle <code>installation</code>, verwaltet
        Wartungsintervalle und erzeugt die QR-Aufkleber.
      </p>
    </div>
  );
}
