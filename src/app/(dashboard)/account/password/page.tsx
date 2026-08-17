import { requireUser } from "@/lib/requireUser";
import { Card, CardHeader } from "@/components/ui/card";
import { PasswordForm } from "@/components/password-form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cambiar contraseña</h1>
        <p className="mt-1 text-sm text-gray-500">
          {user.email} — si recibiste una clave temporal, cambiala aquí por una
          definitiva.
        </p>
      </div>

      <Card>
        <CardHeader title="Nueva contraseña" />
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>
    </div>
  );
}