import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { AutoRefresh } from "@/components/auto-refresh";
import { LEAD_STATUS_LABELS, LEAD_STATUS_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  await requireUser();

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

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

      {leads.length === 0 ? (
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
                        <Link
                          href={`/correos/new?to=${encodeURIComponent(lead.email.split(/[\s,;]+/)[0])}`}
                          className="text-xs text-indigo-600 hover:underline"
                          title="Enviar correo a este lead"
                        >
                          {lead.email}
                        </Link>
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
        </Card>
      )}
    </div>
  );
}