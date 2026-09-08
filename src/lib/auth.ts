import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export type AppRole = "admin" | "buero" | "monteur";

/**
 * Better-Auth-Instanz. Laeuft direkt auf der Neon-Postgres-Datenbank.
 *
 * Lazy aufgebaut, damit ein fehlendes DATABASE_URL/BETTER_AUTH_SECRET nicht
 * schon den Modul-Import sprengt - der Health-Endpunkt soll das melden koennen.
 */
let cached: ReturnType<typeof createAuth> | undefined;

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,

    // next dev (:3000) und Worker-Preview (:8787) sind zwei verschiedene
    // Origins. Ohne diesen Eintrag lehnt Better Auth Logins am jeweils
    // anderen Port mit INVALID_ORIGIN ab.
    trustedOrigins: ["http://localhost:3000", "http://localhost:8787"],

    emailAndPassword: {
      enabled: true,
      // MVP: Konten legt das Buero an (scripts/create-user.mts).
      // Ohne disableSignUp waere POST /api/auth/sign-up/email oeffentlich.
      disableSignUp: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
    },

    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "monteur" satisfies AppRole,
          // Rolle vergibt das Buero, nicht der Nutzer selbst.
          input: false,
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 Tage - Monteure sollen nicht taeglich neu ran
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    // Muss der letzte Plugin-Eintrag bleiben: setzt Cookies in Next.js
    // Server Actions / Route Handlers.
    plugins: [nextCookies()],
  });
}

export function getAuth() {
  cached ??= createAuth();
  return cached;
}

/**
 * Proxy, damit `auth.api.getSession(...)` wie eine normale Instanz benutzt
 * werden kann, die Instanz aber erst beim ersten Zugriff entsteht.
 *
 * `has` muss mitgefangen werden: toNextJsHandler() prueft mit
 * `"handler" in auth`, und ohne Trap wuerde das gegen das leere Ziel laufen.
 */
export const auth = new Proxy({} as ReturnType<typeof createAuth>, {
  get: (_target, prop) => Reflect.get(getAuth(), prop),
  has: (_target, prop) => Reflect.has(getAuth(), prop),
  ownKeys: () => Reflect.ownKeys(getAuth()),
  getOwnPropertyDescriptor: (_target, prop) =>
    Reflect.getOwnPropertyDescriptor(getAuth(), prop),
});

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
