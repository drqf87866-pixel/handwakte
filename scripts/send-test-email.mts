/**
 * Testet den Resend-Mailversand aus der .env, ohne dev-Server oder DB.
 *
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file=.env scripts/send-test-email.mts -- --to=...
 */
import { parseArgs } from "node:util";

import { sendMaintenanceDueEmail } from "../src/lib/email.ts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");

const { values } = parseArgs({
  args,
  options: {
    to: { type: "string" },
    from: { type: "string" },
  },
});

const to = values.to?.trim() || process.env.MAINTENANCE_NOTIFY_EMAIL?.trim();
if (!to) {
  console.error("Kein Empfaenger: --to=... uebergeben oder MAINTENANCE_NOTIFY_EMAIL in .env setzen.");
  process.exit(1);
}

if (values.from) {
  process.env.RESEND_FROM = values.from;
}

console.log(`  Absender:   ${process.env.RESEND_FROM ?? "(RESEND_FROM nicht gesetzt)"}`);
console.log(`  Empfaenger: ${to}`);

const faelligAm = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

try {
  const data = await sendMaintenanceDueEmail({
    to,
    kunde: "Testkunde (dev)",
    anlage: "Testanlage Mailversand-Check",
    standort: "Musterstrasse 1, 12345 Teststadt",
    faelligAm,
  });
  console.log(`\n  Versand OK - Resend-ID: ${data?.id ?? "(keine id)"}`);
} catch (error) {
  console.error(`\n  Versand fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
