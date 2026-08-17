import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { TaskItem } from "@/components/task-item";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUser();

  const [tasks, pendingCount, overdueCount] = await Promise.all([
    prisma.task.findMany({
      include: { lead: { select: { id: true, name: true } } },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    }),
    prisma.task.count({ where: { completed: false } }),
    prisma.task.count({
      where: { completed: false, dueDate: { lt: new Date() } },
    }),
  ]);

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Recordatorios y follow-ups del equipo comercial
          </p>
        </div>
        <LinkButton href="/tasks/new">+ Nueva tarea</LinkButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Pendientes</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{pendingCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500">Atrasadas</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">{overdueCount}</p>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No hay tareas"
          description="Crea la primera tarea de seguimiento para un lead."
          action={<LinkButton href="/tasks/new">+ Nueva tarea</LinkButton>}
        />
      ) : (
        <>
          <Card>
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                Pendientes ({pending.length})
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">
                Sin tareas pendientes. ¡Todo al día!
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pending.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </ul>
            )}
          </Card>

          {completed.length > 0 ? (
            <Card>
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-base font-semibold text-gray-900">
                  Completadas ({completed.length})
                </h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {completed.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}

      <p className="text-xs text-gray-400">
        Tareas a cargo de {user.name ?? "ti"}. Crea tareas desde este módulo o desde el detalle de un lead.
      </p>
    </div>
  );
}