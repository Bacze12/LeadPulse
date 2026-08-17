import { requireUser } from "@/lib/requireUser";
import { Card, CardHeader } from "@/components/ui/card";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo lead</h1>
        <p className="mt-1 text-sm text-gray-500">
          Registra un prospecto para darle seguimiento
        </p>
      </div>
      <Card>
        <CardHeader title="Datos del contacto" />
        <div className="p-5">
          <LeadForm />
        </div>
      </Card>
    </div>
  );
}