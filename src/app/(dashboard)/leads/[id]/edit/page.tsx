import { notFound } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar lead</h1>
        <p className="mt-1 text-sm text-gray-500">
          Actualiza la información del contacto
        </p>
      </div>
      <Card>
        <CardHeader title="Datos del contacto" />
        <div className="p-5">
          <LeadForm lead={lead} />
        </div>
      </Card>
    </div>
  );
}