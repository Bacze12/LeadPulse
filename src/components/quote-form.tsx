"use client";

import { useActionState } from "react";
import { createQuote } from "@/actions/quotes";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

type LeadOption = {
  id: string;
  name: string;
  company: string | null;
};

const CURRENCIES = ["USD", "CLP"];

export function QuoteForm({
  leads,
  defaultLeadId,
}: {
  leads: LeadOption[];
  defaultLeadId?: string;
}) {
  const [state, action, pending] = useActionState(createQuote, undefined);

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
          <Label htmlFor="amount">Monto *</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />
        </div>
        <div>
          <Label htmlFor="currency">Moneda</Label>
          <Select id="currency" name="currency" defaultValue="USD">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" name="description" placeholder="Concepto, alcance, condiciones..." />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <LinkButton href="/quotes" variant="secondary">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Crear cotización"}
        </Button>
      </div>
    </form>
  );
}