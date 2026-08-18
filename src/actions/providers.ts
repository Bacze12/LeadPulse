"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { providerFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";

export type ProviderActionState =
  | { error?: string; ok?: boolean }
  | undefined;

function pick(data: z.infer<typeof providerFormSchema>) {
  return {
    name: data.name,
    rut: data.rut ?? null,
    contactName: data.contactName ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    category: data.category ?? null,
    website: data.website ?? null,
    address: data.address ?? null,
    notes: data.notes ?? null,
    status: data.status,
  };
}

export async function createProvider(
  _prev: ProviderActionState,
  formData: FormData
): Promise<ProviderActionState> {
  await requireUser();

  const parsed = providerFormSchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    category: formData.get("category"),
    website: formData.get("website"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Revisa los datos del proveedor (nombre obligatorio)." };
  }

  const provider = await prisma.provider.create({ data: pick(parsed.data) });
  await emitN8n({
    event: "provider.created",
    entity: "provider",
    data: { id: provider.id, name: provider.name, status: provider.status },
  });

  revalidatePath("/proveedores");
  return { ok: true };
}

export async function updateProvider(
  id: string,
  _prev: ProviderActionState,
  formData: FormData
): Promise<ProviderActionState> {
  await requireUser();

  const parsed = providerFormSchema.safeParse({
    name: formData.get("name"),
    rut: formData.get("rut"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    category: formData.get("category"),
    website: formData.get("website"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: "Revisa los datos del proveedor (nombre obligatorio)." };
  }

  const provider = await prisma.provider.update({
    where: { id },
    data: pick(parsed.data),
  });
  await emitN8n({
    event: "provider.updated",
    entity: "provider",
    data: { id: provider.id, name: provider.name, status: provider.status },
  });

  revalidatePath("/proveedores");
  return { ok: true };
}

export async function deleteProvider(id: string): Promise<{ error?: string }> {
  await requireUser();
  const provider = await prisma.provider.delete({ where: { id } });
  await emitN8n({
    event: "provider.deleted",
    entity: "provider",
    data: { id: provider.id, name: provider.name },
  });
  revalidatePath("/proveedores");
  return {};
}