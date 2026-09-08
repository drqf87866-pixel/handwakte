import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getResend } from "@/lib/email";
import { headObject } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail: string; ms: number };

/** Drizzle verpackt Treiberfehler - die eigentliche Ursache steckt in `cause`. */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? error.cause.message : undefined;
  return cause ? `${error.message} (${cause})` : error.message;
}

async function check(fn: () => Promise<string>): Promise<Check> {
  const start = Date.now();
  try {
    return { ok: true, detail: await fn(), ms: Date.now() - start };
  } catch (error) {
    return { ok: false, detail: describe(error), ms: Date.now() - start };
  }
}

/**
 * Verbindungstest fuer alle externen Abhaengigkeiten.
 *
 * Antwortet bewusst immer mit 200 und einem Detail-Objekt, damit sich im Browser
 * ablesen laesst, welcher Baustein klemmt. `ok` fasst das Gesamtergebnis zusammen.
 */
export async function GET() {
  const [db, r2, resend, authCheck] = await Promise.all([
    // Neon: echter Roundtrip ueber den HTTP-Driver.
    check(async () => {
      const rows = await getDb().execute(sql`select 1 as ping`);
      return `Neon erreichbar (${JSON.stringify(rows.rows?.[0] ?? rows)})`;
    }),

    // R2: head() auf einen Probe-Key. null heisst "Binding da, Objekt gibt es
    // nicht" - genau das erwarten wir.
    check(async () => {
      const probe = await headObject("__healthcheck__");
      return probe ? "Binding MY_BUCKET erreichbar (Probe-Objekt vorhanden)" : "Binding MY_BUCKET erreichbar";
    }),

    // Resend: nur Client-Init und Key-Praesenz, kein Versand.
    check(async () => {
      getResend();
      if (!process.env.RESEND_FROM) throw new Error("RESEND_FROM ist nicht gesetzt.");
      return `Client initialisiert, Absender ${process.env.RESEND_FROM}`;
    }),

    // Better Auth: Instanz aufbauen und eine (leere) Session aufloesen.
    check(async () => {
      const session = await auth.api.getSession({ headers: new Headers() });
      return session ? "Instanz bereit, Session aktiv" : "Instanz bereit, keine Session";
    }),
  ]);

  const checks = { db, r2, resend, auth: authCheck };
  const ok = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    { ok, timestamp: new Date().toISOString(), checks },
    { headers: { "cache-control": "no-store" } },
  );
}
