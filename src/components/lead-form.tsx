"use client";

import { useActionState } from "react";
import { createLead, updateLead } from "@/actions/leads";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

type LeadFields = {
  id?: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

export function LeadForm({ lead }: { lead?: LeadFields }) {
  const isEditing = Boolean(lead?.id);
  const action = isEditing ? updateLead : createLead;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      {lead?.id ? <input type="hidden" name="id" value={lead.id} /> : null}

      <div>
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Nombre del contacto"
          defaultValue={lead?.name}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            name="company"
            placeholder="Nombre de la empresa"
            defaultValue={lead?.company ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            defaultValue={lead?.email ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+52 55 1234 5678"
            defaultValue={lead?.phone ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="source">Origen</Label>
          <Input
            id="source"
            name="source"
            placeholder="Web, WhatsApp, referencia..."
            defaultValue={lead?.source ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="website">Sitio web</Label>
          <Input
            id="website"
            name="website"
            placeholder="https://ejemplo.cl"
            defaultValue={lead?.website ?? ""}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Etiquetas</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="Separadas por coma: Scraped, CCTV, SinEmail"
          defaultValue={lead?.tags?.join(", ") ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Contexto, intereses, requerimientos..."
          defaultValue={lead?.notes ?? ""}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <LinkButton
          href={isEditing && lead?.id ? `/leads/${lead.id}` : "/leads"}
          variant="secondary"
        >
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear lead"}
        </Button>
      </div>
    </form>
  );
}