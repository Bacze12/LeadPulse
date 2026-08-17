import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `crm_${randomBytes(24).toString("hex")}`;
}

export function keyPrefix(key: string): string {
  return key.slice(0, 8);
}

export function maskSecret(secret?: string): string {
  if (!secret) return "(no configurado)";
  if (secret.length <= 8) return "••••••••";
  return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
}

export async function authenticateApiKey(req: Request): Promise<boolean> {
  const provided = req.headers.get("x-api-key");
  if (!provided) return false;

  const envSecret = process.env.N8N_INBOUND_SECRET;
  if (envSecret && provided === envSecret) return true;

  const hash = hashApiKey(provided);
  const found = await prisma.apiKey.findFirst({
    where: { hashedKey: hash, revokedAt: null },
  });
  if (!found) return false;

  await prisma.apiKey
    .update({ where: { id: found.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return true;
}