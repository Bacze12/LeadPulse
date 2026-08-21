import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { markAllNotificationsRead } from "@/actions/notifications";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Asignaciones, cambios de estado y actividad relevante
            {unread > 0 ? ` · ${unread} sin leer` : ""}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Marcar todas como leídas
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Sin notificaciones"
          description="Aquí verás cuando te asignen un lead, cambien estados o llegue actividad relevante."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-gray-100">
            {notifications.map((n) => {
              const inner = (
                <span className="flex w-full items-start gap-3 px-5 py-4 text-left">
                  <span
                    className={
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full" +
                      (n.readAt ? " bg-transparent" : " bg-indigo-500")
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        "block text-sm" +
                        (n.readAt
                          ? " text-gray-700"
                          : " font-semibold text-gray-900")
                      }
                    >
                      {n.title}
                    </span>
                    {n.body ? (
                      <span className="block text-xs text-gray-500">
                        {n.body}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(n.createdAt)}
                  </span>
                </span>
              );
              return (
                <li key={n.id} className={n.readAt ? "" : "bg-indigo-50/40"}>
                  {n.link ? (
                    <Link href={n.link} className="hover:bg-gray-50">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
