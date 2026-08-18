import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { ProviderForm } from "@/components/provider-form";
import { deleteProvider } from "@/actions/providers";
import { PROVIDER_STATUS_LABELS, PROVIDER_STATUS_STYLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const editing = sp.edit
    ? await prisma.provider.findUnique({ where: { id: sp.edit } })
    : null;

  const [providers, total] = await Promise.all([
    prisma.provider.findMany({
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.provider.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : skip + 1;
  const end = Math.min(skip + PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Catálogo de proveedores y servicios para el negocio.
          </p>
        </div>
        <LinkButton href="/proveedores">+ Nuevo proveedor</LinkButton>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            {total === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-gray-500">
                Aún no hay proveedores registrados. Crea el primero con el
                formulario o vía API.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Proveedor
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Contacto
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Categoría
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Estado
                        </th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {providers.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-gray-900">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.rut ?? "Sin RUT"}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm text-gray-700">
                              {p.contactName ?? "—"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.email ?? ""}
                              {p.phone ? (p.email ? " · " : "") + p.phone : ""}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {p.category ?? "—"}
                          </td>
                          <td className="px-5 py-4">
                            <Badge
                              label={
                                PROVIDER_STATUS_LABELS[p.status] ?? p.status
                              }
                              className={PROVIDER_STATUS_STYLES[p.status] ?? ""}
                            />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/proveedores?edit=${p.id}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                              >
                                Editar
                              </Link>
                              <DeleteButton
                                label="Eliminar"
                                onDelete={deleteProvider.bind(null, p.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
                  <p className="text-xs text-gray-500">
                    Mostrando {start}–{end} de {total} proveedores · Página{" "}
                    {page} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <LinkButton
                        href={`/proveedores?page=${page - 1}`}
                        variant="secondary"
                      >
                        ← Anterior
                      </LinkButton>
                    ) : null}
                    {page < totalPages ? (
                      <LinkButton
                        href={`/proveedores?page=${page + 1}`}
                        variant="secondary"
                      >
                        Siguiente →
                      </LinkButton>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader
              title={editing ? "Editar proveedor" : "Nuevo proveedor"}
              description={
                editing
                  ? `Editando: ${editing.name}`
                  : "Completa los datos del proveedor"
              }
            />
            <div className="p-5">
              <ProviderForm provider={editing} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}