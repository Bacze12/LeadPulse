import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmailLink } from "@/components/email-link";
import { LEAD_STATUS_LABELS, LEAD_STATUS_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.lead.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : skip + 1;
  const end = Math.min(skip + PAGE_SIZE, total);

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

      {total === 0 ? (
        <EmptyState
          title="Aún no hay leads"
          description="Crea tu primer lead manualmente o deja que n8n lo haga a través del webhook."
          action={<LinkButton href="/leads/new">+ Nuevo lead</LinkButton>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Lead
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Contacto
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Creado
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {lead.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {lead.company ?? "Sin empresa"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{lead.phone ?? "—"}</p>
                      {lead.email ? (
                        <EmailLink value={lead.email} className="text-xs text-indigo-600 hover:underline" />
                      ) : (
                        <p className="text-xs text-gray-500" />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        label={LEAD_STATUS_LABELS[lead.status]}
                        className={LEAD_STATUS_STYLES[lead.status]}
                      />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-500">
              Mostrando {start}–{end} de {total} leads · Página {page} de{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <LinkButton
                  href={`/leads?page=${page - 1}`}
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
                        href={`/leads?page=${p}`}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        {p}
                      </Link>
                    )}
                  </span>
                ))}
              {page < totalPages ? (
                <LinkButton href={`/leads?page=${page + 1}`} variant="secondary">
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