"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { resetPassword } from "@/lib/auth-client";
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

/** Mindestlaenge, passend zu minPasswordLength in src/lib/auth.ts. */
const MIN_LAENGE = 8;

function serverFehlerEindeutschen(meldung: string): string {
  if (/too short|minimum|at least \d+ characters/i.test(meldung)) {
    return `Das neue Passwort braucht mindestens ${MIN_LAENGE} Zeichen.`;
  }
  if (/invalid token/i.test(meldung)) {
    return "Der Link ist ungueltig oder abgelaufen. Bitte fordern Sie einen neuen an.";
  }
  return meldung;
}

/**
 * Loest den Reset-Link aus der Mail ein. Das Token kommt als Query-Param
 * von der Better-Auth-API (Weiterleitung nach Token-Pruefung).
 */
export function NeuesPasswortForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkFehler = searchParams.get("error");

  const [pending, setPending] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);

  if (linkFehler || !token) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Link ungueltig</CardTitle>
          <CardDescription>
            Dieser Link ist ungueltig oder abgelaufen (Links gelten 1 Stunde
            und nur einmal). Fordern Sie einfach einen neuen an.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <Link href="/passwort-vergessen">Neuen Link anfordern</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Ab hier verengt: gueltiger String fuers Formular-Closure.
  const resetToken: string = token;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const daten = new FormData(event.currentTarget);

    const neu = String(daten.get("neu") ?? "");
    const wiederholung = String(daten.get("wiederholung") ?? "");

    if (neu.length < MIN_LAENGE) {
      setFehler(`Das neue Passwort braucht mindestens ${MIN_LAENGE} Zeichen.`);
      return;
    }
    if (neu !== wiederholung) {
      setFehler("Die beiden neuen Passwoerter stimmen nicht ueberein.");
      return;
    }

    setFehler(null);
    setPending(true);
    const { error } = await resetPassword({ newPassword: neu, token: resetToken });
    setPending(false);

    if (error) {
      setFehler(serverFehlerEindeutschen(error.message ?? "") || "Speichern fehlgeschlagen");
      return;
    }

    setFertig(true);
  }

  if (fertig) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Passwort gespeichert</CardTitle>
          <CardDescription>
            Ihr neues Passwort gilt ab sofort. Andere Geraete wurden dabei
            abgemeldet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <Link href="/login">Zur Anmeldung</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">Neues Passwort</CardTitle>
        <CardDescription>
          Vergeben Sie ein neues Passwort fuer Ihr Konto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="neu">Neues Passwort</Label>
            <Input
              id="neu"
              name="neu"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LAENGE}
            />
            <p className="text-muted-foreground text-xs">
              Mindestens {MIN_LAENGE} Zeichen.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wiederholung">Neues Passwort wiederholen</Label>
            <Input
              id="wiederholung"
              name="wiederholung"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_LAENGE}
            />
          </div>
          {fehler ? (
            <p className="text-destructive text-sm" aria-live="polite">
              {fehler}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-1 w-full" size="lg">
            {pending ? "Wird gespeichert …" : "Passwort speichern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
