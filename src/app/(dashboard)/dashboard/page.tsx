import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { TaskItem } from "@/components/task-item";
import { AutoRefresh } from "@/components/auto-refresh";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
} from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/format";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireUser();

  const [
    totalLeads,
    leadsByStatus,
    upcomingVisitCount,
    upcomingVisits,
    pendingQuoteCount,
    pendingTaskCount,
    pendingTasks,
    recentLeads,
    recentQuotes,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.visit.count({
      where: {
        scheduledFor: { gte: new Date() },
        status: { in: ["PROGRAMADA", "CONFIRMADA"] },
      },
    }),
    prisma.visit.findMany({
      where: {
        scheduledFor: { gte: new Date() },
        status: { in: ["PROGRAMADA", "CONFIRMADA"] },
      },
      include: { lead: true },
      orderBy: { scheduledFor: "asc" },
      take: 5,
    }),
    prisma.quote.count({ where: { status: "ENVIADA" } }),
    prisma.task.count({ where: { completed: false } }),
    prisma.task.findMany({
      where: { completed: false },
      include: { lead: { select: { id: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 5,
    }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.quote.findMany({
      include: { lead: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of leadsByStatus) {
    statusCounts[row.status] = row._count._all;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Resumen general de tus leads y oportunidades
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LinkButton href="/leads/new">+ Nuevo lead</LinkButton>
          <AutoRefresh />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total de leads" value={totalLeads} href="/leads" />
        <StatCard
          label="Leads ganados"
          value={statusCounts["GANADO"] ?? 0}
          hint="Negocios cerrados"
          href="/leads"
        />
        <StatCard
          label="Visitas próximas"
          value={upcomingVisitCount}
          href="/visits"
        />
        <StatCard
          label="Cotizaciones por aprobar"
          value={pendingQuoteCount}
          href="/quotes"
        />
        <StatCard
          label="Tareas pendientes"
          value={pendingTaskCount}
          href="/tasks"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Pipeline de leads"
            description="Distribución por estado"
          />
          <div className="space-y-3 p-5">
            {Object.entries(LEAD_STATUS_LABELS).map(([status, label]) => {
              const count = statusCounts[status] ?? 0;
              const percent = totalLeads === 0 ? 0 : Math.round((count / totalLeads) * 100);
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-gray-700">
                      <Badge label={label} className={LEAD_STATUS_STYLES[status]} />
                    </span>
                    <span className="text-gray-500">
                      {count} · {percent}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Próximas visitas"
            description="Visitas programadas y confirmadas"
            action={
              <LinkButton href="/visits/new" variant="secondary">
                Agendar
              </LinkButton>
            }
          />
          {upcomingVisits.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500">
              No hay visitas programadas.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingVisits.map((visit) => (
                <li key={visit.id} className="flex items-center justify-between gap-3 px-5 py-3">
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
                    </p>
                  </div>
                  <Badge
                    label={visit.status === "PROGRAMADA" ? "Programada" : "Confirmada"}
                    className={
                      visit.status === "PROGRAMADA"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Leads recientes"
            action={
              <LinkButton href="/leads" variant="secondary">
                Ver todos
              </LinkButton>
            }
          />
          <ul className="divide-y divide-gray-100">
            {recentLeads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                    <p className="text-xs text-gray-500">
                      {lead.company ?? "Sin empresa"} · {formatDate(lead.createdAt)}
                    </p>
                  </div>
                  <Badge label={LEAD_STATUS_LABELS[lead.status]} className={LEAD_STATUS_STYLES[lead.status]} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Cotizaciones recientes"
            action={
              <LinkButton href="/quotes" variant="secondary">
                Ver todas
              </LinkButton>
            }
          />
          <ul className="divide-y divide-gray-100">
            {recentQuotes.map((quote) => (
              <li key={quote.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <Link
                    href={`/leads/${quote.leadId}`}
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {quote.lead.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(quote.amount, quote.currency)}
                  </p>
                </div>
                <Badge
                  label={
                    quote.status === "APROBADA"
                      ? "Aprobada"
                      : quote.status === "RECHAZADA"
                        ? "Rechazada"
                        : quote.status === "ENVIADA"
                          ? "Enviada"
                          : "Borrador"
                  }
                  className={
                    quote.status === "APROBADA"
                      ? "bg-emerald-100 text-emerald-800"
                      : quote.status === "RECHAZADA"
                        ? "bg-rose-100 text-rose-800"
                        : quote.status === "ENVIADA"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-200 text-gray-700"
                  }
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Tareas pendientes"
          description="Recordatorios y follow-ups sin completar"
          action={
            <LinkButton href="/tasks" variant="secondary">
              Ver todas
            </LinkButton>
          }
        />
        {pendingTasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">
            No hay tareas pendientes. ¡Todo al día!
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}