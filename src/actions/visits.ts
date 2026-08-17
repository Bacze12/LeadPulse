"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { visitFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";
import { VISIT_STATUSES } from "@/lib/constants";
import type { VisitStatus } from "@/generated/prisma/enums";

export type ActionState = { error?: string } | undefined;

export async function createVisit(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = visitFormSchema.safeParse({
    leadId: formData.get("leadId"),
    scheduledFor: formData.get("scheduledFor"),
    address: formData.get("address"),
    technicianName: formData.get("technicianName"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;
  const scheduledFor = new Date(data.scheduledFor);

  const visit = await prisma.visit.create({
    data: {
      leadId: data.leadId,
      scheduledFor,
      address: data.address,
      technicianName: data.technicianName,
      notes: data.notes,
      createdById: user.id,
    },
    include: { lead: true },
  });

  await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: "VISITA_AGENDADA" },
  });

  await emitN8n({
    event: "visit.scheduled",
    entity: "visit",
    data: {
      id: visit.id,
      leadId: visit.leadId,
      leadName: visit.lead.name,
      scheduledFor: scheduledFor.toISOString(),
    },
  });

  revalidatePath("/visits");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/visits");
}

export async function updateVisitStatus(
  visitId: string,
  status: string
): Promise<{ error?: string; success?: boolean }> {
  await requireUser();

  if (!VISIT_STATUSES.includes(status as (typeof VISIT_STATUSES)[number])) {
    return { error: "Estado inválido." };
  }

  const visit = await prisma.visit.update({
    where: { id: visitId },
    data: { status: status as VisitStatus },
    include: { lead: true },
  });

  await emitN8n({
    event: "visit.status_changed",
    entity: "visit",
    data: {
      id: visit.id,
      leadId: visit.leadId,
      leadName: visit.lead.name,
      status: visit.status,
    },
  });

  revalidatePath("/visits");
  revalidatePath(`/leads/${visit.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteVisit(
  visitId: string
): Promise<{ error?: string }> {
  await requireUser();

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) return { error: "La visita no existe." };

  await prisma.visit.delete({ where: { id: visitId } });

  await emitN8n({
    event: "visit.deleted",
    entity: "visit",
    data: { id: visit.id, leadId: visit.leadId },
  });

  revalidatePath("/visits");
  revalidatePath("/dashboard");
  return {};
}