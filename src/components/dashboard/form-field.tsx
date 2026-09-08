"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Basis = {
  name: string;
  label: string;
  /** Meldung aus ActionState.fieldErrors[name]. */
  fehler?: string;
  hinweis?: string;
};

export type FormFieldProps = Basis & Omit<React.ComponentProps<"input">, "name">;

/**
 * Label, Eingabe und Feldfehler in einem Block - die drei Teile wandern in
 * beiden Formularen ueber ein Dutzend Mal ueber den Bildschirm.
 */
export function FormField({ name, label, fehler, hinweis, ...props }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={Boolean(fehler)} {...props} />
      <FeldFuss name={name} fehler={fehler} hinweis={hinweis} />
    </div>
  );
}

export type TextAreaFieldProps = Basis & Omit<React.ComponentProps<"textarea">, "name">;

export function TextAreaField({
  name,
  label,
  fehler,
  hinweis,
  ...props
}: TextAreaFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} aria-invalid={Boolean(fehler)} {...props} />
      <FeldFuss name={name} fehler={fehler} hinweis={hinweis} />
    </div>
  );
}

export type SelectFieldProps = Basis & Omit<React.ComponentProps<"select">, "name">;

/**
 * Bewusst ein natives `<select>` mit den Input-Klassen: Radix-Select
 * uebertraegt seinen Wert nicht an das Formular und braeuchte ein zusaetzliches
 * Hidden-Input plus Client-State.
 */
export function SelectField({
  name,
  label,
  fehler,
  hinweis,
  children,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        aria-invalid={Boolean(fehler)}
        className={
          "border-input bg-card focus-visible:border-ring focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 h-10 w-full rounded-xl border px-3 py-2 text-base shadow-xs transition-colors outline-none focus-visible:ring-3 aria-invalid:ring-3 md:text-sm " +
          (className ?? "")
        }
        {...props}
      >
        {children}
      </select>
      <FeldFuss name={name} fehler={fehler} hinweis={hinweis} />
    </div>
  );
}

function FeldFuss({ name, fehler, hinweis }: Pick<Basis, "name" | "fehler" | "hinweis">) {
  if (fehler) {
    return (
      <p id={`${name}-fehler`} className="text-destructive text-xs" aria-live="polite">
        {fehler}
      </p>
    );
  }

  if (hinweis) return <p className="text-muted-foreground text-xs">{hinweis}</p>;

  return null;
}
