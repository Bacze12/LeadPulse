"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { interactionFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";

export type ActionState = { error?: string } | undefined;

export async function addInteraction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = interactionFormSchema.safeParse({
    leadId: formData.get("leadId"),
    type: formData.get("type"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;

  const interaction = await prisma.interaction.create({
    data: {
      leadId: data.leadId,
      type: data.type,
      content: data.content,
      createdById: user.id,
    },
  });

  await emitN8n({
    event: "note.created",
    entity: "lead",
    data: {
      id: interaction.id,
      leadId: interaction.leadId,
      type: interaction.type,
      content: interaction.content,
    },
  });

  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/leads");
  return {};
}

export async function deleteInteraction(
  interactionId: string,
  leadId: string
): Promise<{ error?: string }> {
  await requireUser();

  const interaction = await prisma.interaction.findUnique({
    where: { id: interactionId },
  });
  if (!interaction) return { error: "La interacción no existe." };

  await prisma.interaction.delete({ where: { id: interactionId } });

  await emitN8n({
    event: "note.deleted",
    entity: "lead",
    data: { id: interaction.id, leadId },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return {};
}