"use server";

import { revalidatePath } from "next/cache";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { userFormSchema, changePasswordSchema } from "@/lib/definitions";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join("");
}

export type CreateUserState =
  | { error?: string; success?: string; tempPassword?: string }
  | undefined;

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const current = await requireUser();
  if (current.role !== "ADMIN") {
    return { error: "Solo administradores pueden crear usuarios." };
  }

  const parsed = userFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos: nombre, correo @arkonsecurity.cl y rol." };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe un usuario con ese correo." };
  }

  const tempPassword = randomPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  await prisma.user.create({
    data: {
      name: data.name,
      email,
      password: hashed,
      role: data.role,
      mustChangePassword: true,
    },
  });

  revalidatePath("/users");
  return {
    success: `Usuario ${email} creado.`,
    tempPassword,
  };
}

export async function resetUserPassword(
  userId: string
): Promise<{ error?: string; tempPassword?: string }> {
  const current = await requireUser();
  if (current.role !== "ADMIN") {
    return { error: "Solo administradores pueden resetear contraseñas." };
  }

  const tempPassword = randomPassword();
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await bcrypt.hash(tempPassword, 10),
      mustChangePassword: true,
    },
  });

  revalidatePath("/users");
  return { tempPassword };
}

export async function deleteUser(
  userId: string
): Promise<{ error?: string; success?: boolean }> {
  const current = await requireUser();
  if (current.role !== "ADMIN") {
    return { error: "Solo administradores pueden eliminar usuarios." };
  }
  if (current.id === userId) {
    return { error: "No puedes eliminar tu propio usuario." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
  return { success: true };
}

export type ChangePasswordState =
  | { error?: string; success?: boolean }
  | undefined;

export async function changeOwnPassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const current = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }

  const user = await prisma.user.findUnique({ where: { id: current.id } });
  if (!user) return { error: "Usuario no encontrado." };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password
  );
  if (!valid) return { error: "La contraseña actual es incorrecta." };

  await prisma.user.update({
    where: { id: current.id },
    data: {
      password: await bcrypt.hash(parsed.data.newPassword, 10),
      mustChangePassword: false,
    },
  });

  return { success: true };
}