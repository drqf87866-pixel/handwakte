"use client";

import { useActionState } from "react";
import Link from "next/link";

import { FormField, TextAreaField } from "@/components/dashboard/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idleState, type ActionState } from "@/lib/actions";
import type { Customer } from "@/lib/db";

export type KundeFormProps = {
  /**
   * Server Action, bereits in der Server-Komponente gebunden (`createKunde`
   * bzw. `updateKunde.bind(null, id)`).
   *
   * Bewusst nicht hier drin gebunden: ein `.bind()` im Render der
   * Client-Komponente erzeugt bei jedem Durchlauf eine neue Action-Referenz.
   */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Gesetzt beim Bearbeiten, leer beim Anlegen. */
  kunde?: Customer;
  /** Vorschlag fuer die naechste freie Kundennummer (nur beim Anlegen). */
  kundennummerVorschlag?: string;
};

export function KundeForm({ action, kunde, kundennummerVorschlag }: KundeFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const fehler = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="kundennummer"
            label="Kundennummer"
            required
            defaultValue={kunde?.kundennummer ?? kundennummerVorschlag ?? ""}
            fehler={fehler.kundennummer}
          />
          <FormField
            name="name"
            label="Name"
            required
            defaultValue={kunde?.name ?? ""}
            fehler={fehler.name}
            hinweis="Firma, Hausverwaltung oder Eigentümer"
          />
          <FormField
            name="ansprechpartner"
            label="Ansprechpartner"
            defaultValue={kunde?.ansprechpartner ?? ""}
            fehler={fehler.ansprechpartner}
          />
          <FormField
            name="telefon"
            label="Telefon"
            type="tel"
            defaultValue={kunde?.telefon ?? ""}
            fehler={fehler.telefon}
          />
          <FormField
            name="email"
            label="E-Mail"
            type="email"
            defaultValue={kunde?.email ?? ""}
            fehler={fehler.email}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anschrift</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="strasse"
            label="Straße und Hausnummer"
            className="sm:col-span-2"
            defaultValue={kunde?.strasse ?? ""}
            fehler={fehler.strasse}
          />
          <FormField
            name="plz"
            label="PLZ"
            inputMode="numeric"
            defaultValue={kunde?.plz ?? ""}
            fehler={fehler.plz}
          />
          <FormField
            name="ort"
            label="Ort"
            defaultValue={kunde?.ort ?? ""}
            fehler={fehler.ort}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notizen</CardTitle>
        </CardHeader>
        <CardContent>
          <TextAreaField
            name="notizen"
            label="Interne Notizen"
            rows={4}
            defaultValue={kunde?.notizen ?? ""}
            fehler={fehler.notizen}
            hinweis="Nur für das Büro sichtbar."
          />
        </CardContent>
      </Card>

      {state.message && !state.ok ? (
        <p className="text-destructive text-sm" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-4 flex gap-2 rounded-2xl border bg-card p-3 shadow-md">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : kunde ? "Änderungen speichern" : "Kunde anlegen"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={kunde ? `/kunden/${kunde.id}` : "/kunden"}>Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
