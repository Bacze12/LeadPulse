"use client";

import { useActionState } from "react";
import { addInteraction } from "@/actions/interactions";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import { INTERACTION_TYPES, INTERACTION_TYPE_LABELS } from "@/lib/constants";

export function InteractionForm({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(addInteraction, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leadId" value={leadId} />
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <Label htmlFor="type">Tipo</Label>
          <Select id="type" name="type" defaultValue="NOTA">
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {INTERACTION_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="content">Detalle *</Label>
          <Textarea
            id="content"
            name="content"
            required
            placeholder="Ej: No contestó, llamar mañana"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Registrar interacción"}
        </Button>
      </div>
    </form>
  );
}