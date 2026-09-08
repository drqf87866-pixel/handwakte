import { NextResponse } from "next/server";

import { runMaintenanceScan } from "@/lib/jobs/maintenance";

export const dynamic = "force-dynamic";

/**
 * Zeitkonstanter Vergleich - verhindert, dass sich das Secret ueber die
 * Antwortzeit Zeichen fuer Zeichen erraten laesst.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.length !== bufB.length) return false;

  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

function istAutorisiert(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Ohne konfiguriertes Secret waere der Endpunkt offen - lieber dicht machen.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token.length > 0 && timingSafeEqual(token, secret);
}

async function handle(request: Request) {
  if (!istAutorisiert(request)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const result = await runMaintenanceScan();
    return NextResponse.json({ ok: result.fehler.length === 0, ...result });
  } catch (error) {
    console.error("[cron] Wartungs-Scan fehlgeschlagen", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

// Der Cloudflare Cron Trigger laeuft ueber scheduled() in src/worker.ts.
// Diese Route ist der manuelle bzw. externe Ausloeser (Test, Fallback-Worker).
export const POST = handle;
export const GET = handle;
