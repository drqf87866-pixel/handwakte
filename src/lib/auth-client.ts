"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Leer lassen heisst: gleiche Origin wie die App. Nur setzen, wenn Auth-Server
  // und Frontend auf unterschiedlichen Domains laufen.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
