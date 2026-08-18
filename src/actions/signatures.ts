"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";

export type SignatureState = { error?: string; ok?: boolean } | undefined;

export async function listUserSignatures() {
  const user = await requireUser();
  return prisma.signature.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function createSignature(
  formData: FormData
): Promise<SignatureState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!name || !content) {
    return { error: "El nombre y el contenido de la firma son obligatorios." };
  }

  const existingCount = await prisma.signature.count({
    where: { userId: user.id },
  });

  await prisma.signature.create({
    data: {
      userId: user.id,
      name,
      content,
      isDefault: existingCount === 0,
    },
  });

  revalidatePath("/correos");
  return { ok: true };
}

export async function updateSignature(
  formData: FormData
): Promise<SignatureState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!id || !name || !content) {
    return { error: "El nombre y el contenido de la firma son obligatorios." };
  }

  const existing = await prisma.signature.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return { error: "Firma no encontrada." };
  }

  await prisma.signature.update({
    where: { id },
    data: { name, content },
  });

  revalidatePath("/correos");
  return { ok: true };
}

export async function deleteSignature(
  formData: FormData
): Promise<SignatureState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const existing = await prisma.signature.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return { error: "Firma no encontrada." };
  }

  const wasDefault = existing.isDefault;

  await prisma.signature.delete({ where: { id } });

  if (wasDefault) {
    const next = await prisma.signature.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    });
    if (next) {
      await prisma.signature.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath("/correos");
  return { ok: true };
}

export async function setDefaultSignature(
  formData: FormData
): Promise<SignatureState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const existing = await prisma.signature.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return { error: "Firma no encontrada." };
  }

  await prisma.$transaction([
    prisma.signature.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    }),
    prisma.signature.update({ where: { id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/correos");
  return { ok: true };
}
