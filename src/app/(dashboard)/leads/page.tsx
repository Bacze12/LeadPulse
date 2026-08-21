import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { processDueScheduledEmails } from "@/actions/mail";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { AutoRefresh } from "@/components/auto-refresh";
import { LeadsFilters } from "@/components/leads-filters";
import { LeadsTable, type LeadRow } from "@/components/leads-table";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
} from "@/lib/constants";
import type { LeadStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/format";
import { parseEmails } from "@/lib/emails";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function buildQuery(
  params: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...params, ...overrides })) {
    if (v) merged[k] = v;
  }
  delete merged.page;
  const qs = new URLSearchParams(merged).toString();
  const pagePart = `page=${overrides.page ?? 1}`;
  return qs ? `${qs}&${pagePart}` : pagePart;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; assigned?: string }>;
}) {
  await requireUser();

  await processDueScheduledEmails().catch(() => {});

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const status =
    sp.status && LEAD_STATUSES.includes(sp.status as (typeof LEAD_STATUSES)[number])
      ? (sp.status as LeadStatus)
      : undefined;
  const assigned =
    sp.assigned === "__none"
      ? null
      : sp.assigned && /^[a-z0-9]{10,}$/i.test(sp.assigned)
        ? sp.assigned
        : undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(sp.assigned === "__none"
      ? { assignedToId: null }
      : assigned
        ? { assignedToId: assigned }
        : {}),
  };

  const [leads, total, users] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.lead.count({ where }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows: LeadRow[] = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    emails: parseEmails(lead.email),
    statusLabel: LEAD_STATUS_LABELS[lead.status],
    statusClass: LEAD_STATUS_STYLES[lead.status],
    assignedName: lead.assignedTo?.name ?? null,
    createdAtLabel: formatDate(lead.createdAt),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : skip + 1;
  const end = Math.min(skip + PAGE_SIZE, total);
  const filterParams = { status: status as string | undefined, assigned: sp.assigned };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">
            Prospectos para contactar y dar seguimiento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LinkButton href="/leads/new">+ Nuevo lead</LinkButton>
          <AutoRefresh />
        </div>
      </div>

      <LeadsFilters
        status={status}
        assigned={sp.assigned}
        users={users}
      />

      {total === 0 ? (
        <EmptyState
          title="No hay leads"
          description={
            status || sp.assigned
              ? "Ningún lead coincide con los filtros seleccionados."
              : "Crea tu primer lead manualmente o deja que n8n lo haga a través del webhook."
          }
          action={<LinkButton href="/leads/new">+ Nuevo lead</LinkButton>}
        />
      ) : (
        <Card>
          <LeadsTable rows={rows} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Mostrando {start}–{end} de {total} leads · Página {page} de{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <LinkButton
                  href={`/leads?${buildQuery(filterParams, { page: String(page - 1) })}`}
                  variant="secondary"
                >
                  ← Anterior
                </LinkButton>
              ) : null}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== p - 1 ? (
                      <span className="text-xs text-gray-400">…</span>
                    ) : null}
                    {p === page ? (
                      <span className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">
                        {p}
                      </span>
                    ) : (
                      <Link
                        href={`/leads?${buildQuery(filterParams, { page: String(p) })}`}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        {p}
                      </Link>
                    )}
                  </span>
                ))}
              {page < totalPages ? (
                <LinkButton
                  href={`/leads?${buildQuery(filterParams, { page: String(page + 1) })}`}
                  variant="secondary"
                >
                  Siguiente →
                </LinkButton>
              ) : null}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
