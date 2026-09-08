import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * Verbindliche Session-Pruefung fuer Server-Komponenten.
 * Die Middleware schaut nur aufs Cookie - hier wird die Session wirklich
 * gegen die Datenbank aufgeloest.
 */
export async function requireSession(redirectTo: string) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  return session;
}

export async function getOptionalSession() {
  return auth.api.getSession({ headers: await headers() });
}
