import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { LEAD_STATUSES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import type { LeadStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null, fallback: number, max = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiKey(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;

  const q = sp.get("q")?.trim();
  const email = sp.get("email")?.trim();
  const phone = sp.get("phone")?.trim();
  const status = sp.get("status")?.trim();
  const tag = sp.get("tag")?.trim();
  const assignedTo = sp.get("assignedTo")?.trim();
  const page = parsePositiveInt(sp.get("page"), 1);
  const limit = parsePositiveInt(sp.get("limit"), 50);

  const where: Prisma.LeadWhereInput = {};

if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
        { n8nId: { contains: q, mode: "insensitive" } },
      ];
    }
  if (email) {
    where.email = { equals: email, mode: "insensitive" };
  }
  if (phone) {
    where.phone = { contains: phone };
  }
  if (status && LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    where.status = status as LeadStatus;
  }
  if (tag) {
    where.tags = { has: tag };
  }
  if (assignedTo) {
    where.assignedToId = assignedTo;
  }

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ total, page, limit, leads });
}