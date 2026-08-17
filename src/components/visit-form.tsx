"use client";

import { useActionState } from "react";
import { createVisit } from "@/actions/visits";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

type LeadOption = {
  id: string;
  name: string;
  company: string | null;
};

export function VisitForm({
  leads,
  defaultLeadId,
}: {
  leads: LeadOption[];
  defaultLeadId?: string;
}) {
  const [state, action, pending] = useActionState(createVisit, undefined);

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="scheduledFor">Fecha y hora *</Label>
          <Input id="scheduledFor" name="scheduledFor" type="datetime-local" required />
        </div>
        <div>
          <Label htmlFor="technicianName">Técnico asignado</Label>
          <Input id="technicianName" name="technicianName" placeholder="Nombre del técnico" />
        </div>
      </div>

      <div>
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" placeholder="Calle, número, colonia..." />
      </div>

      <div>
        <Label htmlFor="notes">Notas de la visita</Label>
        <Textarea id="notes" name="notes" placeholder="Trabajo a realizar, accesos, contactos..." />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <LinkButton href="/visits" variant="secondary">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Agendar visita"}
        </Button>
      </div>
    </form>
  );
}