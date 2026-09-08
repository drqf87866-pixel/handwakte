import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export * from "./schema";

export type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

function createDb(connectionString: string) {
  // neon-http spricht Postgres ueber HTTP-Fetch statt TCP. Damit gibt es in der
  // Worker-Runtime kein Connection-Pooling-Problem und keine offenen Sockets
  // zwischen Requests.
  return drizzle(neon(connectionString), { schema });
}

/**
 * Datenbank-Client. Wird beim ersten Aufruf erzeugt und dann im Modul gehalten.
 *
 * Bewusst lazy: ein fehlendes DATABASE_URL soll erst beim tatsaechlichen
 * Datenbankzugriff auffallen (und dort als sauberer Fehler in /api/health
 * landen), nicht schon beim Import des Moduls.
 */
export function getDb(): Database {
  if (cached) return cached;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Neon Connection String in .env bzw. .dev.vars eintragen.",
    );
  }

  cached = createDb(connectionString);
  return cached;
}
