import { PasswortForm } from "@/components/shared/passwort-form";
import { SignOutButton } from "@/components/shared/sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Geteilter Inhalt der Profil-Seite (Buero- und Monteur-Layout).
 * Zeigt Konto-Info, Passwortwechsel und Abmelden untereinander.
 */
export function ProfilInhalt({
  name,
  email,
  rolle,
}: {
  name: string;
  email: string;
  rolle: string;
}) {
  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Konto, Passwort und Abmelden an einem Ort.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konto</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="truncate font-medium">{name || email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">E-Mail</dt>
              <dd className="truncate font-medium">{email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Rolle</dt>
              <dd className="font-medium">{rolle}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <PasswortForm />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abmelden</CardTitle>
          <CardDescription>
            Leert den Seiten-Zwischenspeicher auf diesem Geraet (geteilte
            Geraete). Offene Sync-Eintraege bleiben erhalten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton
            variant="outline"
            size="default"
            className="w-full"
            labelClassName=""
          />
        </CardContent>
      </Card>
    </div>
  );
}
