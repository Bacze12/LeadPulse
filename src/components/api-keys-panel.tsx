"use client";

import { useState, useActionState } from "react";
import { createApiKey, revokeApiKey } from "@/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatDate } from "@/lib/format";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

export function ApiKeysPanel({ keys }: { keys: ApiKeyRow[] }) {
  const [state, action, pending] = useActionState(createApiKey, undefined);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const active = keys.filter((k) => !k.revokedAt);
  const revoked = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-3">
        {state?.error ? (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Label htmlFor="key-name">Nombre de la API key</Label>
            <Input
              id="key-name"
              name="name"
              required
              placeholder="Ej: Webhook n8n, Integrador web"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Creando..." : "Crear API key"}
          </Button>
        </div>
      </form>

      {state?.key ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <p className="font-medium">{state.success}</p>
          <p className="mt-1">Esta es la única vez que verás la clave completa:</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs">
              {state.key}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(state.key ?? "");
              }}
              className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50"
            >
              Copiar
            </button>
          </div>
          <p className="mt-2 text-xs text-emerald-700">
            Úsala en el header <code>x-api-key</code> en cada petición.
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-gray-900">
          Claves activas ({active.length})
        </p>
        {active.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No hay API keys. Crea una para conectar n8n u otros servicios.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {active.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{k.name}</p>
                  <p className="text-xs text-gray-500">
                    <code className="font-mono">{k.prefix}••••••••</code>
                    {" · "}Creada {formatDate(k.createdAt)}
                    {k.lastUsedAt
                      ? ` · Usada ${formatDate(k.lastUsedAt)}`
                      : " · Sin uso aún"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  disabled={revokingId === k.id}
                  onClick={async () => {
                    if (window.confirm("¿Revocar esta API key? Dejará de funcionar de inmediato.")) {
                      setRevokingId(k.id);
                      await revokeApiKey(k.id);
                      setRevokingId(null);
                    }
                  }}
                >
                  Revocar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {revoked.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-900">
            Revocadas ({revoked.length})
          </p>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50">
            {revoked.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="text-sm text-gray-500">
                  <span className="line-through">{k.name}</span>{" "}
                  <code className="font-mono text-xs">{k.prefix}••••••••</code>
                </p>
                <span className="text-xs text-gray-400">
                  Revocada {formatDate(k.revokedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}