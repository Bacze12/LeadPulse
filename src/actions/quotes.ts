"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { quoteFormSchema } from "@/lib/definitions";
import { emitN8n } from "@/lib/n8n";
import { QUOTE_STATUSES } from "@/lib/constants";
import type { QuoteStatus } from "@/generated/prisma/enums";

export type ActionState = { error?: string } | undefined;

export async function createQuote(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = quoteFormSchema.safeParse({
    leadId: formData.get("leadId"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "MXN",
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }

  const data = parsed.data;

  const quote = await prisma.quote.create({
    data: {
      leadId: data.leadId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      createdById: user.id,
    },
    include: { lead: true },
  });

  await prisma.lead.update({
    where: { id: data.leadId },
    data: { status: "COTIZADO" },
  });

  await emitN8n({
    event: "quote.created",
    entity: "quote",
    data: {
      id: quote.id,
      leadId: quote.leadId,
      leadName: quote.lead.name,
      amount: quote.amount.toString(),
      currency: quote.currency,
      status: quote.status,
    },
  });

  revalidatePath("/quotes");
  revalidatePath(`/leads/${data.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/quotes");
}

export async function updateQuoteStatus(
  quoteId: string,
  status: string
): Promise<{ error?: string; success?: boolean }> {
  await requireUser();

  if (!QUOTE_STATUSES.includes(status as (typeof QUOTE_STATUSES)[number])) {
    return { error: "Estado inválido." };
  }

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status: status as QuoteStatus },
    include: { lead: true },
  });

  if (status === "APROBADA") {
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: { status: "GANADO" },
    });
  }

  await emitN8n({
    event: "quote.status_changed",
    entity: "quote",
    data: {
      id: quote.id,
      leadId: quote.leadId,
      leadName: quote.lead.name,
      status: quote.status,
    },
  });

  revalidatePath("/quotes");
  revalidatePath(`/leads/${quote.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteQuote(
  quoteId: string
): Promise<{ error?: string }> {
  await requireUser();

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { error: "La cotización no existe." };

  await prisma.quote.delete({ where: { id: quoteId } });

  await emitN8n({
    event: "quote.deleted",
    entity: "quote",
    data: { id: quote.id, leadId: quote.leadId },
  });

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return {};
}