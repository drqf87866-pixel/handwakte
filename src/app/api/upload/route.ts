import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { attachment, getDb } from "@/lib/db";
import { buildObjectKey, objectUrl, putObject, type ObjectKeyInput } from "@/lib/r2";

export const dynamic = "force-dynamic";

/** Fotos vom Handy, Signatur-PNGs und Fremd-PDFs - mehr braucht die Bauakte nicht. */
const ERLAUBTE_TYPEN = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_BYTES = 15 * 1024 * 1024;

const ART_ZU_ORDNER: Record<string, ObjectKeyInput["kind"]> = {
  foto: "fotos",
  signatur: "signaturen",
  pdf: "dokumente",
  sonstiges: "dokumente",
};

/**
 * Proxy-Upload in den R2-Bucket.
 *
 * Der Monteur schickt multipart/form-data an diese Route, der Worker legt die
 * Datei ueber das Binding ab und schreibt die Metadaten nach Postgres.
 * (Direkte Browser-Uploads brauchen Presigned URLs ueber die S3-API - siehe
 * Hinweis in src/lib/r2.ts.)
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const installationId = form.get("installationId");
  const reportId = form.get("reportId");
  const artRaw = String(form.get("art") ?? "foto");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Feld 'file' fehlt" }, { status: 400 });
  }
  if (typeof installationId !== "string" || !installationId) {
    return NextResponse.json({ error: "Feld 'installationId' fehlt" }, { status: 400 });
  }

  const art = artRaw in ART_ZU_ORDNER ? (artRaw as keyof typeof ART_ZU_ORDNER) : "sonstiges";
  const contentType = file.type || "application/octet-stream";

  if (!ERLAUBTE_TYPEN.has(contentType)) {
    return NextResponse.json({ error: `Dateityp ${contentType} nicht erlaubt` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Datei zu gross (max. ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const key = buildObjectKey({
    kind: ART_ZU_ORDNER[art],
    installationId,
    filename: file.name || "upload",
  });

  await putObject(key, await file.arrayBuffer(), {
    contentType,
    customMetadata: { installationId, uploadedBy: session.user.id },
  });

  const [row] = await getDb()
    .insert(attachment)
    .values({
      id: crypto.randomUUID(),
      installationId,
      reportId: typeof reportId === "string" && reportId ? reportId : null,
      r2Key: key,
      dateiname: file.name || "upload",
      contentType,
      groesseBytes: file.size,
      art: art === "foto" || art === "signatur" || art === "pdf" ? art : "sonstiges",
      hochgeladenVon: session.user.id,
    })
    .returning();

  return NextResponse.json({ id: row.id, key, url: objectUrl(key) }, { status: 201 });
}
