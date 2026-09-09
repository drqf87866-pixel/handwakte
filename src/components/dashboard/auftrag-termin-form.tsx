"use client";

import { useActionState } from "react";
import Link from "next/link";

import { FormField, SelectField, TextAreaField } from "@/components/dashboard/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { idleState, type ActionState } from "@/lib/actions";
import { alsDateInput } from "@/lib/dates";

export type AuftragTerminFormProps = {
  /**
   * Server Action, bereits in der Server-Komponente gebunden
   * (`terminAuftrag.bind(null, jobId)`).
   *
   * Bewusst nicht hier drin gebunden: ein `.bind()` im Render der
   * Client-Komponente erzeugt bei jedem Durchlauf eine neue Action-Referenz.
   */
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  auftrag: {
    terminAm: Date | null;
    faelligAm: Date;
    monteurId: string | null;
    notiz: string | null;
  };
  /** Alle Benutzer als Monteur-Vorschlaege (Rollenfilter folgt spaeter). */
  monteure: Array<{ id: string; name: string }>;
};

export function AuftragTerminForm({ action, auftrag, monteure }: AuftragTerminFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const fehler = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Termin vergeben</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            name="terminAm"
            label="Termin"
            type="date"
            required
            defaultValue={alsDateInput(auftrag.terminAm ?? auftrag.faelligAm)}
            fehler={fehler.terminAm}
          />
          <SelectField
            name="monteurId"
            label="Monteur"
            defaultValue={auftrag.monteurId ?? ""}
            fehler={fehler.monteurId}
            hinweis="Optional - kann das Büro später nachtragen."
          >
            <option value="">Noch nicht zugeteilt</option>
            {monteure.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            name="notiz"
            label="Notiz"
            rows={3}
            className="sm:col-span-2"
            defaultValue={auftrag.notiz ?? ""}
            fehler={fehler.notiz}
            hinweis="z.B. Zufahrt, Ansprechpartner vor Ort."
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
          {pending ? "Wird gespeichert …" : "Termin speichern"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/dashboard">Abbrechen</Link>
        </Button>
      </div>
    </form>
  );
}
