"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { idleState, type ActionState } from "@/lib/actions";

export type ActionButtonProps = {
  /** Bereits per bind() an die ID gebundene Server Action. */
  action: (prev: ActionState) => Promise<ActionState>;
  label: string;
  /** Rueckfrage vor dem Absenden. Ohne Text wird nicht nachgefragt. */
  confirm?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  pendingLabel?: string;
};

/**
 * Button fuer Aktionen ohne eigenes Formular (Loeschen, Deaktivieren).
 *
 * Statt eines Dialog-Components genuegt hier `window.confirm` - die Rueckfrage
 * kommt selten und muss nichts weiter erfassen als Ja oder Nein.
 */
export function ActionButton({
  action,
  label,
  confirm,
  variant = "outline",
  pendingLabel = "Moment...",
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, idleState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
    </form>
  );
}
