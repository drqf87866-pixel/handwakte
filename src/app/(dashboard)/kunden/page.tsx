import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kunden" };

export default function KundenPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Kunden</h1>
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Platzhalter. Liest spaeter die Tabelle <code>customer</code> und bietet Anlegen,
        Bearbeiten und den Sprung in die Anlagen des Kunden.
      </p>
    </div>
  );
}
