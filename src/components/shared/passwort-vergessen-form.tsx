"use client";

import { useState } from "react";

import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Fordert einen Reset-Link an. Zeigt bewusst immer dieselbe neutrale
 * Meldung - auch bei unbekannter Adresse, damit sich nicht aufzählen
 * laesst, welche Konten existieren.
 */
export function PasswortVergessenForm() {
  const [pending, setPending] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");

    setFehler(null);
    setPending(true);
    const { error } = await requestPasswordReset({
      email,
      redirectTo: "/neues-passwort",
    });
    setPending(false);

    if (error) {
      setFehler("Anfordern fehlgeschlagen. Bitte spaeter erneut versuchen.");
      return;
    }

    setGesendet(true);
  }

  if (gesendet) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Mail ist unterwegs</CardTitle>
          <CardDescription>
            Falls ein Konto mit dieser Adresse existiert, erhalten Sie in
            Kuerze eine Mail mit einem Link. Der Link gilt 1 Stunde.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Passwort vergessen</CardTitle>
        <CardDescription>
          Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen Link, mit dem
          Sie ein neues Passwort vergeben.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              placeholder="name@betrieb.de"
              required
            />
          </div>
          {fehler ? (
            <p className="text-destructive text-sm" aria-live="polite">
              {fehler}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-1 w-full" size="lg">
            {pending ? "Wird angefordert …" : "Link anfordern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
