"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { generateApiKey, hashApiKey, keyPrefix } from "@/lib/api-auth";

export type ApiKeyState =
  | { error?: string; success?: string; key?: string }
  | undefined;

function assertAdmin() {
  return requireUser().then((user) => {
    if (user.role !== "ADMIN") {
      throw new Error("Solo administradores pueden gestionar API keys.");
    }
    return user;
  });
}

export async function createApiKey(
  _prev: ApiKeyState,
  formData: FormData
): Promise<ApiKeyState> {
  let current;
  try {
    current = await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ponle un nombre a la API key." };

  const key = generateApiKey();
  await prisma.apiKey.create({
    data: {
      name,
      prefix: keyPrefix(key),
      hashedKey: hashApiKey(key),
      createdById: current.id,
    },
  });

  revalidatePath("/settings");
  return {
    success: `API key "${name}" creada.`,
    key,
  };
}

export async function revokeApiKey(id: string): Promise<{ error?: string }> {
  try {
    await assertAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/settings");
  return {};
}