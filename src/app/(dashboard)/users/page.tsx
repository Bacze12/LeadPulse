import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { UserForm } from "@/components/user-form";
import { ResetPasswordButton } from "@/components/reset-password-button";
import { deleteUser } from "@/actions/users";
import { formatDate } from "@/lib/format";
import { ROLE_LABELS, ROLE_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const current = await requireUser();
  if (current.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignedLeads: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Crea cuentas solo con correos @arkonsecurity.cl. Cada cuenta recibe una
          clave temporal.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Cuentas"
              description={`${users.length} usuario(s) registrados`}
            />
            <ul className="divide-y divide-gray-100">
              {users.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      {user.name}
                      {user.id === current.id ? (
                        <span className="text-xs text-gray-400">(tú)</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge
                        label={ROLE_LABELS[user.role] ?? user.role}
                        className={ROLE_STYLES[user.role] ?? ""}
                      />
                      {user.mustChangePassword ? (
                        <Badge
                          label="Clave temporal"
                          className="bg-amber-100 text-amber-800"
                        />
                      ) : null}
                      <span>{user._count.assignedLeads} leads</span>
                      <span>Creado: {formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ResetPasswordButton userId={user.id} />
                    {user.id !== current.id ? (
                      <DeleteButton
                        label="Eliminar"
                        onDelete={deleteUser.bind(null, user.id)}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Nuevo usuario" />
            <div className="p-5">
              <UserForm />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}