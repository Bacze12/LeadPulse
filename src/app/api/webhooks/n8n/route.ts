import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { emitN8n } from "@/lib/n8n";
import { authenticateApiKey } from "@/lib/api-auth";
import { LEAD_STATUSES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import type { LeadStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type LeadInput = {
  n8nId?: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  source?: string;
  notes?: string;
  status?: string;
  tags?: string[];
  extraContacts?: unknown;
  messageId?: string;
};

function sanitizeStatus(status?: string): LeadStatus | undefined {
  if (!status) return undefined;
  if (!LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
    return undefined;
  }
  return status as LeadStatus;
}

function pick(data: LeadInput) {
  return {
    company: data.company ?? undefined,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    website: data.website ?? undefined,
    source: data.source ?? undefined,
    notes: data.notes ?? undefined,
    status: sanitizeStatus(data.status),
    n8nId: data.n8nId ?? undefined,
    tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
    extraContacts: (data.extraContacts ??
      undefined) as Prisma.InputJsonValue | undefined,
    messageId: data.messageId ?? undefined,
  };
}

async function findExisting(data: LeadInput, id?: string) {
  if (id) {
    const byId = await prisma.lead.findUnique({ where: { id } });
    if (byId) return byId;
  }
  if (data.n8nId) {
    const byN8n = await prisma.lead.findUnique({ where: { n8nId: data.n8nId } });
    if (byN8n) return byN8n;
  }
  if (data.email) {
    const byEmail = await prisma.lead.findFirst({
      where: { email: { equals: data.email, mode: "insensitive" } },
    });
    if (byEmail) return byEmail;
  }
  if (data.phone) {
    const byPhone = await prisma.lead.findFirst({
      where: { phone: { contains: data.phone } },
    });
    if (byPhone) return byPhone;
  }
  return null;
}

function normalizeExtraContacts(
  extraContacts: unknown,
  phones?: string[],
  emails?: string[]
): Prisma.InputJsonValue | undefined {
  if (extraContacts !== undefined) {
    return extraContacts as Prisma.InputJsonValue;
  }
  if (!phones && !emails) return undefined;
  const list: Array<{ type: string; value: string }> = [];
  (phones ?? []).forEach((p) => list.push({ type: "phone", value: p }));
  (emails ?? []).forEach((e) => list.push({ type: "email", value: e }));
  return list;
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiKey(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const email = sp.get("email");
  const phone = sp.get("phone");
  const q = sp.get("q");
  const status = sp.get("status");
  const tag = sp.get("tag");
  const assignedTo = sp.get("assignedTo");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50)
  );

  const where: Prisma.LeadWhereInput = {};
  if (email) where.email = { equals: email, mode: "insensitive" };
  if (phone) where.phone = { contains: phone };
  const validStatus = sanitizeStatus(status ?? undefined);
  if (validStatus) where.status = validStatus;
  if (tag) where.tags = { has: tag };
  if (assignedTo) {
    where.assignedToId = assignedTo === "null" ? null : assignedTo;
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  if (!(await authenticateApiKey(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const action =
    typeof body.action === "string" ? body.action.toLowerCase() : "upsert";
  const rawData = (body.data ?? body) as Record<string, unknown>;
  const data: LeadInput = {
    n8nId: typeof rawData.n8nId === "string" ? rawData.n8nId : undefined,
    name: typeof rawData.name === "string" ? rawData.name : undefined,
    company: typeof rawData.company === "string" ? rawData.company : undefined,
    email: typeof rawData.email === "string" ? rawData.email : undefined,
    phone: typeof rawData.phone === "string" ? rawData.phone : undefined,
    website: typeof rawData.website === "string" ? rawData.website : undefined,
    source: typeof rawData.source === "string" ? rawData.source : undefined,
    notes: typeof rawData.notes === "string" ? rawData.notes : undefined,
    status: typeof rawData.status === "string" ? rawData.status : undefined,
    messageId:
      typeof rawData.messageId === "string" ? rawData.messageId : undefined,
    tags: Array.isArray(rawData.tags)
      ? rawData.tags.filter((t): t is string => typeof t === "string")
      : undefined,
    extraContacts: rawData.extraContacts,
  };

  const phones = Array.isArray(rawData.phones)
    ? rawData.phones.filter((p): p is string => typeof p === "string")
    : undefined;
  const emails = Array.isArray(rawData.emails)
    ? rawData.emails.filter((e): e is string => typeof e === "string")
    : undefined;

  const extraContacts = normalizeExtraContacts(
    data.extraContacts,
    phones,
    emails
  );

  const id = typeof body.id === "string" ? body.id : undefined;

  try {
    if (action === "delete") {
      const existing = await findExisting(data, id);
      if (!existing) {
        return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
      }
      await prisma.lead.delete({ where: { id: existing.id } });
      await emitN8n({
        event: "lead.deleted",
        entity: "lead",
        data: { id: existing.id },
      });
      return NextResponse.json({ ok: true, id: existing.id });
    }

    if (action === "update") {
      const existing = await findExisting(data, id);
      if (!existing) {
        return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
      }
      const updated = await prisma.lead.update({
        where: { id: existing.id },
        data: { ...pick(data), extraContacts },
      });
      await emitN8n({
        event: "lead.updated",
        entity: "lead",
        data: { ...updated },
      });
      return NextResponse.json(updated);
    }

    const existing = await findExisting(data, id);

    if (action === "create" && existing) {
      return NextResponse.json(
        { error: "El lead ya existe", lead: existing },
        { status: 409 }
      );
    }

    if (existing) {
      const updated = await prisma.lead.update({
        where: { id: existing.id },
        data: {
          ...pick(data),
          ...(data.name ? { name: data.name } : {}),
          ...(extraContacts !== undefined ? { extraContacts } : {}),
        },
      });
      await emitN8n({
        event: "lead.updated",
        entity: "lead",
        data: { ...updated },
      });
      return NextResponse.json(updated);
    }

    if (!data.name) {
      return NextResponse.json(
        { error: "El campo name es requerido para crear un lead" },
        { status: 400 }
      );
    }

    const created = await prisma.lead.create({
      data: {
        name: data.name,
        ...pick(data),
        tags: data.tags ?? [],
        extraContacts,
      },
    });
    await emitN8n({
      event: "lead.created",
      entity: "lead",
      data: { ...created },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error en webhook n8n:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}