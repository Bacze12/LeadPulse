"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createProvider, updateProvider } from "@/actions/providers";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { PROVIDER_STATUSES, PROVIDER_STATUS_LABELS } from "@/lib/constants";

type ProviderFormProps = {
  provider?: {
    id: string;
    name: string;
    rut: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    category: string | null;
    website: string | null;
    address: string | null;
    notes: string | null;
    status: string;
  } | null;
};

export function ProviderForm({ provider }: ProviderFormProps) {
  const router = useRouter();
  const action = provider
    ? updateProvider.bind(null, provider.id)
    : createProvider;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}
      {state?.ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Proveedor guardado correctamente.
        </div>
      ) : null}

      <div>
        <Label htmlFor="p-name">Nombre / Razón social *</Label>
        <Input id="p-name" name="name" required defaultValue={provider?.name ?? ""} placeholder="Ej: Proveedor Seguridad SpA" />
      </div>
      <div>
        <Label htmlFor="p-rut">RUT</Label>
        <Input id="p-rut" name="rut" defaultValue={provider?.rut ?? ""} placeholder="76.123.456-7" />
      </div>
      <div>
        <Label htmlFor="p-contact">Persona de contacto</Label>
        <Input id="p-contact" name="contactName" defaultValue={provider?.contactName ?? ""} placeholder="Nombre del contacto" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" name="email" type="email" defaultValue={provider?.email ?? ""} placeholder="contacto@proveedor.cl" />
        </div>
        <div>
          <Label htmlFor="p-phone">Teléfono</Label>
          <Input id="p-phone" name="phone" defaultValue={provider?.phone ?? ""} placeholder="+56 9 ..." />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="p-category">Categoría</Label>
          <Input id="p-category" name="category" defaultValue={provider?.category ?? ""} placeholder="Ej: Alarmas, Cámaras, Custodia" />
        </div>
        <div>
          <Label htmlFor="p-status">Estado</Label>
          <Select id="p-status" name="status" defaultValue={provider?.status ?? "ACTIVO"}>
            {PROVIDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROVIDER_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="p-website">Sitio web</Label>
        <Input id="p-website" name="website" defaultValue={provider?.website ?? ""} placeholder="https://proveedor.cl" />
      </div>
      <div>
        <Label htmlFor="p-address">Dirección</Label>
        <Input id="p-address" name="address" defaultValue={provider?.address ?? ""} placeholder="Dirección del proveedor" />
      </div>
      <div>
        <Label htmlFor="p-notes">Notas</Label>
        <Textarea id="p-notes" name="notes" rows={3} defaultValue={provider?.notes ?? ""} placeholder="Condiciones, servicios, observaciones..." />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : provider ? "Guardar cambios" : "Crear proveedor"}
        </Button>
        {provider ? (
          <Button type="button" variant="secondary" onClick={() => router.push("/proveedores")}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}