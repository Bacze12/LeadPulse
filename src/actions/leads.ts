"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { leadFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";
import { LEAD_STATUSES } from "@/lib/constants";
import type { LeadStatus } from "@/generated/prisma/enums";

export type ActionState = { error?: string } | undefined;

function parseTags(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function leadPayload(lead: {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  source: string | null;
  status: string;
}) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    source: lead.source,
    status: lead.status,
  };
}

export async function createLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = leadFormSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      website: data.website,
      source: data.source,
      notes: data.notes,
      tags: parseTags(data.tags),
      createdById: user.id,
    },
  });

  await emitN8n({
    event: "lead.created",
    entity: "lead",
    data: leadPayload(lead),
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireUser();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Falta el identificador del lead." };
  }

  const parsed = leadFormSchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone,
      website: data.website,
      source: data.source,
      notes: data.notes,
      tags: parseTags(data.tags),
    },
  });

  await emitN8n({
    event: "lead.updated",
    entity: "lead",
    data: leadPayload(lead),
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${lead.id}`);
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ error?: string; success?: boolean }> {
  await requireUser();

  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return { error: "Estado inválido." };
  }

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as LeadStatus },
  });

  await emitN8n({
    event: "lead.status_changed",
    entity: "lead",
    data: leadPayload(lead),
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLead(leadId: string): Promise<{ error?: string }> {
  await requireUser();

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: "El lead no existe." };

  await prisma.lead.delete({ where: { id: leadId } });

  await emitN8n({
    event: "lead.deleted",
    entity: "lead",
    data: { id: lead.id },
  });

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return {};
}

export async function assignLead(
  leadId: string,
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  await requireUser();

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { assignedTo: true },
  });
  if (!lead) return { error: "El lead no existe." };

  const assignedToId = userId || null;

  if (lead.assignedToId === assignedToId) {
    return { success: true };
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId },
    include: { assignedTo: true },
  });

  await emitN8n({
    event: "lead.assigned",
    entity: "lead",
    data: {
      id: updated.id,
      name: updated.name,
      assignedTo: updated.assignedTo
        ? { id: updated.assignedTo.id, name: updated.assignedTo.name, email: updated.assignedTo.email }
        : null,
    },
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}