"use client";

import { useState } from "react";

import { changePassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Mindestlaenge, passend zu minPasswordLength in src/lib/auth.ts. */
const MIN_LAENGE = 8;

function serverFehlerEindeutschen(meldung: string): string {
  if (/invalid password/i.test(meldung)) return "Das aktuelle Passwort ist falsch.";
  if (/too short|minimum|at least \d+ characters/i.test(meldung)) {
    return `Das neue Passwort braucht mindestens ${MIN_LAENGE} Zeichen.`;
  }
  return meldung;
}

export function PasswortForm() {
  const [pending, setPending] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formular = event.currentTarget;
    const daten = new FormData(formular);

    const aktuell = String(daten.get("aktuell") ?? "");
    const neu = String(daten.get("neu") ?? "");
    const wiederholung = String(daten.get("wiederholung") ?? "");

    if (neu.length < MIN_LAENGE) {
      setFehler(`Das neue Passwort braucht mindestens ${MIN_LAENGE} Zeichen.`);
      return;
    }
    if (neu !== wiederholung) {
      setFehler("Die beiden neuen Passwörter stimmen nicht überein.");
      return;
    }

    setFehler(null);
    setPending(true);
    const { error } = await changePassword({
      currentPassword: aktuell,
      newPassword: neu,
      revokeOtherSessions: true,
    });
    setPending(false);

    if (error) {
      setFehler(serverFehlerEindeutschen(error.message ?? "") || "Ändern fehlgeschlagen");
      return;
    }

    formular.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neues Passwort</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="aktuell">Aktuelles Passwort</Label>
            <Input
              id="aktuell"
              name="aktuell"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
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
          <Button type="submit" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Passwort ändern"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
