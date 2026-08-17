"use client";

import { useActionState } from "react";
import { createTask } from "@/actions/tasks";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { TASK_ACTION_TYPES, TASK_ACTION_LABELS } from "@/lib/constants";

type LeadOption = {
  id: string;
  name: string;
  company: string | null;
};

export function TaskForm({
  leads,
  defaultLeadId,
}: {
  leads: LeadOption[];
  defaultLeadId?: string;
}) {
  const [state, action, pending] = useActionState(createTask, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <div>
        <Label htmlFor="leadId">Lead *</Label>
        <Select id="leadId" name="leadId" defaultValue={defaultLeadId ?? ""} required>
          <option value="" disabled>
            Selecciona un lead
          </option>
          {leads.map((lead) => (
            <option key={lead.id} value={lead.id}>
              {lead.name}
              {lead.company ? ` (${lead.company})` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Ej: Llamar para seguimiento"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="actionType">Tipo de acción</Label>
          <Select id="actionType" name="actionType" defaultValue="SEGUIMIENTO">
            {TASK_ACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TASK_ACTION_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dueDate">Vence *</Label>
          <Input id="dueDate" name="dueDate" type="datetime-local" required />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" placeholder="Instrucciones o contexto de la tarea" />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <LinkButton href="/tasks" variant="secondary">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Crear tarea"}
        </Button>
      </div>
    </form>
  );
}