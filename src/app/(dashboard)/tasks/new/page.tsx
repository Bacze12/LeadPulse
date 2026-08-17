import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { TaskForm } from "@/components/task-form";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  await requireUser();
  const { leadId } = await searchParams;

  const leads = await prisma.lead.findMany({
    where: leadId ? undefined : { status: { not: "GANADO" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, company: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nueva tarea</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea un recordatorio o follow-up para un lead
        </p>
      </div>
      <Card>
        <CardHeader title="Datos de la tarea" />
        <div className="p-5">
          <TaskForm leads={leads} defaultLeadId={leadId} />
        </div>
      </Card>
    </div>
  );
}