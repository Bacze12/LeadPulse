import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { deleteVisit } from "@/actions/visits";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { VisitStatusSelect } from "@/components/visit-status-select";
import { VISIT_STATUS_LABELS, VISIT_STATUS_STYLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  await requireUser();

  const visits = await prisma.visit.findMany({
    include: { lead: true },
    orderBy: { scheduledFor: "asc" },
  });

  const upcoming = visits.filter(
    (v) =>
      new Date(v.scheduledFor) >= new Date() &&
      v.status !== "CANCELADA" &&
      v.status !== "REALIZADA" &&
      v.status !== "NO_ASISTIO"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas técnicas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Agenda y da seguimiento a las visitas en sitio
          </p>
        </div>
        <LinkButton href="/visits/new">+ Agendar visita</LinkButton>
      </div>

      {visits.length === 0 ? (
        <EmptyState
          title="No hay visitas agendadas"
          description="Agenda la primera visita técnica para un lead."
          action={<LinkButton href="/visits/new">+ Agendar visita</LinkButton>}
        />
      ) : (
        <>
          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Próximas visitas ({upcoming.length})
              </h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">
                No hay visitas próximas.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.map((visit) => (
                  <li key={visit.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div>
                      <Link
                        href={`/leads/${visit.leadId}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {visit.lead.name}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {formatDate(visit.scheduledFor)} ·{" "}
                        {new Date(visit.scheduledFor).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {visit.technicianName ? ` · ${visit.technicianName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        label={VISIT_STATUS_LABELS[visit.status]}
                        className={VISIT_STATUS_STYLES[visit.status]}
                      />
                      <DeleteButton onDelete={deleteVisit.bind(null, visit.id)} label="Eliminar" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Historial ({visits.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Lead
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Fecha
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Técnico
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {visits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <Link
                          href={`/leads/${visit.leadId}`}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {visit.lead.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatDate(visit.scheduledFor)}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {visit.technicianName ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <VisitStatusSelect visitId={visit.id} status={visit.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <DeleteButton onDelete={deleteVisit.bind(null, visit.id)} label="Eliminar" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}