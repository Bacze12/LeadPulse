import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";
import { emitN8n } from "@/lib/n8n";
import type { Prisma } from "@/generated/prisma/client";

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
  const status = sp.get("status")?.trim();
  const category = sp.get("category")?.trim();
  const page = parsePositiveInt(sp.get("page"), 1);
  const limit = parsePositiveInt(sp.get("limit"), 50);

  const where: Prisma.ProviderWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { rut: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (category) where.category = { contains: category, mode: "insensitive" };

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.provider.count({ where }),
  ]);

  return NextResponse.json({ total, page, limit, providers });
}

type ProviderInput = {
  id?: string;
  name?: string;
  rut?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  category?: string;
  website?: string;
  address?: string;
  notes?: string;
  status?: string;
};

export async function POST(request: NextRequest) {
  if (!(await authenticateApiKey(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const data = body as ProviderInput;
  const action = (data as { action?: string }).action ?? "upsert";
  const provider = data as ProviderInput;

  const name = (provider.name ?? "").trim();
  const isUpdateOrDelete = action === "update" || action === "delete";
  if (!isUpdateOrDelete && !name) {
    return NextResponse.json({ error: "El campo name es requerido" }, { status: 400 });
  }

  const payload = {
    name,
    rut: provider.rut ?? null,
    contactName: provider.contactName ?? null,
    email: provider.email ?? null,
    phone: provider.phone ?? null,
    category: provider.category ?? null,
    website: provider.website ?? null,
    address: provider.address ?? null,
    notes: provider.notes ?? null,
    status: provider.status ?? "ACTIVO",
  };

  try {
    let result;

    if (action === "delete") {
      if (!provider.id) {
        return NextResponse.json({ error: "id requerido para eliminar" }, { status: 400 });
      }
      const existing = await prisma.provider.findUnique({ where: { id: provider.id } });
      if (!existing) {
        return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
      }
      result = await prisma.provider.delete({ where: { id: provider.id } });
      await emitN8n({
        event: "provider.deleted",
        entity: "provider",
        data: { id: result.id, name: result.name },
      });
      return NextResponse.json(result);
    }

    if (action === "update" || (provider.id && action !== "create")) {
      if (!provider.id) {
        return NextResponse.json({ error: "id requerido para actualizar" }, { status: 400 });
      }
      const existing = await prisma.provider.findUnique({ where: { id: provider.id } });
      if (!existing) {
        return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
      }
      result = await prisma.provider.update({
        where: { id: provider.id },
        data: { ...payload, name: name || existing.name },
      });
      await emitN8n({
        event: "provider.updated",
        entity: "provider",
        data: { id: result.id, name: result.name, status: result.status },
      });
      return NextResponse.json(result);
    }

    const existing = await prisma.provider.findFirst({
      where: {
        OR: [
          provider.email ? { email: { equals: provider.email, mode: "insensitive" } } : {},
          provider.rut ? { rut: provider.rut } : {},
        ],
      },
    });
    if (existing && action === "create") {
      return NextResponse.json({ error: "Proveedor ya existe" }, { status: 409 });
    }
    if (existing) {
      result = await prisma.provider.update({ where: { id: existing.id }, data: payload });
      await emitN8n({
        event: "provider.updated",
        entity: "provider",
        data: { id: result.id, name: result.name, status: result.status },
      });
      return NextResponse.json(result);
    }

    result = await prisma.provider.create({ data: payload });
    await emitN8n({
      event: "provider.created",
      entity: "provider",
      data: { id: result.id, name: result.name, status: result.status },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("Error en /api/providers:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}