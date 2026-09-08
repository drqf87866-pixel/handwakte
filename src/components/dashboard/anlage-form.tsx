"use client";

import { useActionState } from "react";
import Link from "next/link";

import { FormField, SelectField } from "@/components/dashboard/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idleState, type ActionState } from "@/lib/actions";
import { alsDateInput } from "@/lib/dates";
import type { Installation } from "@/lib/db";

export type AnlageFormProps = {
  /** Siehe KundeForm: in der Server-Komponente gebundene Server Action. */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Gesetzt beim Bearbeiten, leer beim Anlegen. */
  anlage?: Installation;
  kunden: Array<{ id: string; name: string; kundennummer: string }>;
  /** Vorauswahl beim Anlegen aus der Kundendetailseite (?kunde=<id>). */
  vorausgewaehlterKunde?: string;
};

export function AnlageForm({
  action,
  anlage,
  kunden,
  vorausgewaehlterKunde,
}: AnlageFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const fehler = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anlage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="customerId"
            label="Kunde"
            required
            className="sm:col-span-2"
            defaultValue={anlage?.customerId ?? vorausgewaehlterKunde ?? ""}
            fehler={fehler.customerId}
          >
            <option value="">Bitte wählen</option>
            {kunden.map((k) => (
              <option key={k.id} value={k.id}>
                {k.kundennummer} - {k.name}
              </option>
            ))}
          </SelectField>
          <FormField
            name="bezeichnung"
            label="Bezeichnung"
            required
            className="sm:col-span-2"
            defaultValue={anlage?.bezeichnung ?? ""}
            fehler={fehler.bezeichnung}
            hinweis="z.B. Gas-Brennwertkessel Haus A"
          />
          <FormField
            name="hersteller"
            label="Hersteller"
            defaultValue={anlage?.hersteller ?? ""}
            fehler={fehler.hersteller}
          />
          <FormField
            name="modell"
            label="Modell"
            defaultValue={anlage?.modell ?? ""}
            fehler={fehler.modell}
          />
          <FormField
            name="serienNr"
            label="Serien-Nr."
            defaultValue={anlage?.serienNr ?? ""}
            fehler={fehler.serienNr}
          />
          <FormField
            name="baujahr"
            label="Baujahr"
            inputMode="numeric"
            defaultValue={anlage?.baujahr ? String(anlage.baujahr) : ""}
            fehler={fehler.baujahr}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aufstellort</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="standort"
            label="Standort"
            className="sm:col-span-2"
            defaultValue={anlage?.standort ?? ""}
            fehler={fehler.standort}
            hinweis="z.B. Keller, Heizraum links"
          />
          <FormField
            name="strasse"
            label="Straße und Hausnummer"
            className="sm:col-span-2"
            defaultValue={anlage?.strasse ?? ""}
            fehler={fehler.strasse}
          />
          <FormField
            name="plz"
            label="PLZ"
            inputMode="numeric"
            defaultValue={anlage?.plz ?? ""}
            fehler={fehler.plz}
          />
          <FormField
            name="ort"
            label="Ort"
            defaultValue={anlage?.ort ?? ""}
            fehler={fehler.ort}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wartung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <FormField
            name="wartungsintervallMonate"
            label="Intervall (Monate)"
            type="number"
            min={1}
            max={120}
            required
            defaultValue={String(anlage?.wartungsintervallMonate ?? 12)}
            fehler={fehler.wartungsintervallMonate}
          />
          <FormField
            name="letzteWartungAm"
            label="Letzte Wartung"
            type="date"
            defaultValue={alsDateInput(anlage?.letzteWartungAm)}
            fehler={fehler.letzteWartungAm}
          />
          <FormField
            name="naechsteWartungAm"
            label="Nächste Wartung"
            type="date"
            defaultValue={alsDateInput(anlage?.naechsteWartungAm)}
            fehler={fehler.naechsteWartungAm}
            hinweis="Leer lassen: wird aus letzter Wartung und Intervall berechnet."
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
          {pending ? "Wird gespeichert …" : anlage ? "Änderungen speichern" : "Anlage anlegen"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href={anlage ? `/anlagen/${anlage.id}` : "/anlagen"}>Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
