import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { ApiKeysPanel } from "@/components/api-keys-panel";
import { maskSecret } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const endpoints = [
  {
    method: "POST",
    path: "/api/webhooks/n8n",
    desc: "Crea, actualiza o elimina leads desde n8n (upsert por email o n8nId). También emite eventos de visitas, cotizaciones, notas y tareas.",
  },
  {
    method: "GET",
    path: "/api/leads",
    desc: "Lista leads con filtros: q, email, phone, status, tag, assignedTo, page, limit.",
  },
];

export default async function SettingsPage() {
  const current = await requireUser();
  if (current.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const apiKeys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
  });

  const webhookUrl = process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/n8n`
    : "http://localhost:3001/api/webhooks/n8n";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Integraciones, API keys y documentación de endpoints.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="API keys"
            description="Crea claves para n8n u otros servicios. Autentica cada petición con el header x-api-key."
          />
          <div className="p-5">
            <ApiKeysPanel
              keys={apiKeys.map((k) => ({
                id: k.id,
                name: k.name,
                prefix: k.prefix,
                lastUsedAt: k.lastUsedAt,
                createdAt: k.createdAt,
                revokedAt: k.revokedAt,
              }))}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Autenticación"
              description="Tanto el webhook como la API aceptan la clave de entorno o cualquier API key activa."
            />
            <div className="space-y-3 px-5 py-4">
              <div>
                <p className="text-sm text-gray-500">
                  Clave secreta de entorno (N8N_INBOUND_SECRET)
                </p>
                <code className="mt-1 block break-all rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 ring-1 ring-gray-200">
                  {maskSecret(process.env.N8N_INBOUND_SECRET)}
                </code>
              </div>
              <div>
                <p className="text-sm text-gray-500">Header a enviar</p>
                <code className="mt-1 block rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-800 ring-1 ring-gray-200">
                  x-api-key: tu_api_key
                </code>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Endpoints disponibles" />
            <ul className="divide-y divide-gray-100">
              {endpoints.map((e) => (
                <li key={e.path} className="px-5 py-3">
                  <p className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        e.method === "POST"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {e.method}
                    </span>
                    <code className="font-mono text-sm text-gray-800">
                      {e.path}
                    </code>
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{e.desc}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Ejemplo con curl" />
            <pre className="overflow-x-auto p-5 font-mono text-xs text-gray-800">
              {`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: crm_tu_clave" \\
  -d '{"name":"Juan Pérez","email":"juan@empresa.cl","company":"Empresa SpA"}'`}
            </pre>
          </Card>
        </div>
      </div>

      {apiKeys.some((k) => k.lastUsedAt) ? (
        <p className="text-xs text-gray-400">
          Última actividad registrada en las API keys. El webhook también
          emite eventos salientes a n8n (N8N_WEBHOOK_URL).
        </p>
      ) : null}
    </div>
  );
}