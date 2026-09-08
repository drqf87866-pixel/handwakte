import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

/**
 * Liefert eine Datei aus dem R2-Bucket aus.
 *
 * Der Bucket ist nicht oeffentlich - jeder Abruf laeuft ueber diese Route und
 * damit durch die Session-Pruefung.
 */
export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { key: segments } = await context.params;
  const key = segments.map(decodeURIComponent).join("/");

  // Kein Ausbrechen aus dem Key-Namensraum.
  if (key.includes("..")) {
    return NextResponse.json({ error: "Ungueltiger Key" }, { status: 400 });
  }

  const object = await getObject(key);
  if (!object) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  // Bewusst nicht object.writeHttpMetadata(headers): die Methode nimmt ein
  // Headers-Objekt entgegen, das der Binding-Proxy von `next dev` nicht
  // serialisieren kann. Die Metadaten selbst zu setzen funktioniert lokal wie
  // im Worker gleichermassen.
  const meta = object.httpMetadata;
  const headers = new Headers({
    "content-type": meta?.contentType ?? "application/octet-stream",
    "content-length": String(object.size),
    etag: object.httpEtag,
    "cache-control": "private, max-age=3600",
  });
  if (meta?.contentDisposition) headers.set("content-disposition", meta.contentDisposition);
  if (meta?.contentEncoding) headers.set("content-encoding", meta.contentEncoding);
  if (meta?.contentLanguage) headers.set("content-language", meta.contentLanguage);

  return new Response(object.body, { headers });
}
