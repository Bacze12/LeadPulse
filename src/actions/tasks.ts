"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { taskFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";

export type ActionState = { error?: string } | undefined;

export async function createTask(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = taskFormSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    actionType: formData.get("actionType"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;
  const dueDate = new Date(data.dueDate);

  const task = await prisma.task.create({
    data: {
      leadId: data.leadId,
      title: data.title,
      actionType: data.actionType,
      dueDate,
      notes: data.notes,
      assignedToId: user.id,
      createdById: user.id,
    },
    include: { lead: true },
  });

  await emitN8n({
    event: "task.created",
    entity: "task",
    data: {
      id: task.id,
      leadId: task.leadId,
      leadName: task.lead.name,
      title: task.title,
      actionType: task.actionType,
      dueDate: dueDate.toISOString(),
      assignedToId: task.assignedToId,
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function toggleTask(
  taskId: string,
  completed: boolean
): Promise<{ error?: string; success?: boolean }> {
  await requireUser();

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { completed, completedAt: completed ? new Date() : null },
    include: { lead: true },
  });

  if (completed) {
    await emitN8n({
      event: "task.completed",
      entity: "task",
      data: {
        id: task.id,
        leadId: task.leadId,
        leadName: task.lead.name,
        title: task.title,
      },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/leads/${task.leadId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  await requireUser();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "La tarea no existe." };

  await prisma.task.delete({ where: { id: taskId } });

  await emitN8n({
    event: "task.deleted",
    entity: "task",
    data: { id: task.id, leadId: task.leadId },
  });

  revalidatePath("/tasks");
  revalidatePath(`/leads/${task.leadId}`);
  revalidatePath("/dashboard");
  return {};
}