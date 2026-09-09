import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { fieldErrors } from "@/lib/actions";
import { protokollAbschliessenKern, protokollSchema } from "@/lib/protokoll-abschluss";

export const dynamic = "force-dynamic";

/**
 * Spielt ein offline erfasstes Protokoll ein (Outbox -> Server).
 *
 * Body als JSON mit denselben Feldern wie das Formular; `attachmentIds` als
 * Array (die Sync-Engine hat die Blobs zuvor ueber /api/upload eingespielt).
 * Antwort: { ok, reportId, jobId, qrToken } oder { error, fieldErrors? }.
 *
 * Session-Pflicht wie /api/upload: Ohne Netz gibt es keinen Sync, also ist
 * beim Aufruf immer eine Pruefung gegen die Datenbank moeglich.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungueltige Daten" }, { status: 400 });
  }

  const parsed = protokollSchema.safeParse({
    ...body,
    // Formular liefert kommagetrennt, die Sync-Engine ein Array.
    attachmentIds: Array.isArray(body.attachmentIds) ? body.attachmentIds.join(",") : "",
  });
  if (!parsed.success) {
    return NextResponse.json(fieldErrors(parsed.error), { status: 400 });
  }

  const ergebnis = await protokollAbschliessenKern(parsed.data, {
    id: session.user.id,
    name: session.user.name,
  });

  if (!ergebnis.ok) {
    return NextResponse.json({ error: ergebnis.message }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    reportId: ergebnis.reportId,
    jobId: ergebnis.jobId,
    qrToken: ergebnis.qrToken,
  });
}
