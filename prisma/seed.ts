import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => CHARS[b % CHARS.length])
    .join("");
}

async function main() {
  const users = [
    {
      email: (process.env.SEED_ADMIN_EMAIL ?? "bcastillo@arkonsecurity.cl").toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? "B. Castillo",
      role: "ADMIN" as const,
    },
    {
      email: (process.env.SEED_EXTRA_EMAIL ?? "cperedo@arkonsecurity.cl").toLowerCase(),
      name: process.env.SEED_EXTRA_NAME ?? "C. Peredo",
      role: "VENDEDOR" as const,
    },
  ];

  console.log("==============================================");
  for (const u of users) {
    const tempPassword = randomPassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hashed, role: u.role, mustChangePassword: true },
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        role: u.role,
        mustChangePassword: true,
      },
    });

    console.log(`✓ ${u.role}: ${u.email}`);
    console.log(`  Contraseña temporal: ${tempPassword}`);
  }
  console.log("  Deben cambiarla al iniciar sesión.");
  console.log("==============================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });