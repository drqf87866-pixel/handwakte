import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { erzeugeProtokollPdf, ladeProtokollFuerPdf, protokollDateiname } from "@/lib/protokoll-pdf";

export const dynamic = "force-dynamic";

/**
 * Serviceprotokoll als PDF-Download (Inhalt wie die Druckansicht).
 *
 * Session-Pflicht wie /api/files: Das PDF enthaelt Kundendaten und die
 * Unterschrift aus dem nicht oeffentlichen Bucket.
 */
export async function GET(request: Request, context: RouteContext<"/api/protokolle/[id]/pdf">) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await context.params;
  const daten = await ladeProtokollFuerPdf(id);
  if (!daten) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  // pdf-lib typisiert das Ergebnis als Uint8Array<ArrayBufferLike>, BodyInit
  // verlangt einen echten ArrayBuffer - die Kopie kostet bei wenigen KB nichts.
  const bytes = new Uint8Array(await erzeugeProtokollPdf(daten));

  return new Response(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${protokollDateiname(daten)}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, no-store",
    },
  });
}
