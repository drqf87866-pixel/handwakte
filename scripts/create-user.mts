/**
 * Legt einen Benutzer an - fuer Produktion oder zum Testen im dev-Branch.
 *
 *   pnpm user:create -- --email=chef@example.de --name="Anna Chef" --role=admin
 *
 * Die App kennt keine Selbstregistrierung (`disableSignUp: true` in
 * src/lib/auth.ts). Konten entstehen ausschliesslich hier.
 *
 * Die DATABASE_URL wird interaktiv erfragt, wenn sie nicht in der Umgebung
 * steht. Das ist Absicht: der Produktions-Connection-String soll weder in einer
 * Datei liegen noch in der Shell haengenbleiben, wo ihn ein spaeteres
 * `pnpm db:push` versehentlich erwischen wuerde.
 */
import { randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { neon } from "@neondatabase/serverless";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/lib/db/schema.ts";

const ROLES = ["admin", "buero", "monteur"] as const;
type Role = (typeof ROLES)[number];

function fail(message: string): never {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

// `pnpm user:create -- --email=...` reicht das "--" mit durch; parseArgs
// wuerde alles dahinter als Positional werten und abbrechen.
const args = process.argv.slice(2).filter((arg) => arg !== "--");

const { values } = parseArgs({
  args,
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "monteur" },
    yes: { type: "boolean", default: false },
  },
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
const role = values.role ?? "monteur";

if (!email || !name) {
  fail(
    'Aufruf: pnpm user:create -- --email=... --name="..." [--role=admin|buero|monteur]',
  );
}
if (!isRole(role)) {
  fail(`Unbekannte Rolle "${role}". Erlaubt: ${ROLES.join(", ")}.`);
}

const rl = createInterface({ input: stdin, output: stdout });

try {
  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    if (!stdin.isTTY) {
      fail("DATABASE_URL ist nicht gesetzt und es gibt kein Terminal zum Nachfragen.");
    }
    databaseUrl = (await rl.question("  Neon Connection String (DATABASE_URL): ")).trim();
  }
  if (!databaseUrl) fail("Ohne DATABASE_URL geht es nicht.");

  // Dev- und Produktions-Branch unterscheiden sich nur im Host. Einmal
  // hinsehen, bevor geschrieben wird.
  const ziel = new URL(databaseUrl);
  console.log(`\n  Ziel-Datenbank: ${ziel.hostname}${ziel.pathname}`);
  console.log(`  Anlegen:        ${name} <${email}> als ${role}`);
  if (!values.yes) {
    const antwort = await rl.question('  Weiter? Zum Bestaetigen "ja" eintippen: ');
    if (antwort.trim().toLowerCase() !== "ja") fail("Abgebrochen, nichts geschrieben.");
  }

  const db = drizzle(neon(databaseUrl), { schema });

  const [vorhanden] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (vorhanden) fail(`Es gibt in dieser Datenbank bereits einen Benutzer mit ${email}.`);

  const vorgegeben = process.env.NEW_USER_PASSWORD?.trim();
  const password = vorgegeben || randomBytes(12).toString("base64url");
  if (password.length < 8) {
    fail("NEW_USER_PASSWORD braucht mindestens 8 Zeichen (minPasswordLength in src/lib/auth.ts).");
  }

  const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    // Der scrypt-Hash haengt nicht am Secret, er ist zwischen CLI und Worker
    // portabel. Das Secret betrifft hier nur die Antwort, die verworfen wird.
    secret: process.env.BETTER_AUTH_SECRET ?? "cli-only",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",

    // Bewusst offen, waehrend die App selbst disableSignUp: true setzt - genau
    // deswegen baut dieses Skript eine eigene Instanz, statt src/lib/auth.ts
    // zu importieren (das ausserdem ueber den @/-Alias importiert, den plain
    // Node nicht aufloest).
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
  });

  const angelegt = await auth.api
    .signUpEmail({ body: { name, email, password } })
    .catch((error: unknown) =>
      fail(`Anlegen fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`),
    );

  // signUpEmail meldet den neuen Benutzer gleich an. Diese Session braucht
  // niemand - sie gehoert zu einem Prozess, der sich gleich beendet.
  await db.delete(schema.session).where(eq(schema.session.userId, angelegt.user.id));

  // `role` steht in src/lib/auth.ts auf input: false und faellt beim Anlegen
  // immer auf "monteur". Deshalb hier nachziehen.
  await db
    .update(schema.user)
    .set({ role, updatedAt: new Date() })
    .where(eq(schema.user.id, angelegt.user.id));

  console.log(`\n  Angelegt: ${email} (${role})`);
  if (!vorgegeben) {
    console.log(`  Passwort: ${password}`);
    console.log("  Jetzt in den Passwortmanager uebernehmen - es wird nicht wieder angezeigt.");
    console.log("  Aendern kann das Konto selbst unter /passwort in der App.\n");
  } else {
    console.log("");
  }
} finally {
  rl.close();
}
