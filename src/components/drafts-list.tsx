"use client";

import Link from "next/link";
import { useState } from "react";
import { cancelScheduledEmail, deleteDraft } from "@/actions/mail";
import { formatDate } from "@/lib/format";

export type DraftRow = {
  id: string;
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  message?: string | null;
  signature?: string | null;
  updatedAt: Date | string;
};

export type ScheduledRow = {
  id: string;
  to: string;
  subject: string;
  scheduledFor: Date | string;
  status: string;
  error?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Programado",
  ENVIADO: "Enviado",
  CANCELADO: "Cancelado",
  ERROR: "Error",
};

export function DraftsList({
  initialDrafts,
  initialScheduled,
}: {
  initialDrafts: DraftRow[];
  initialScheduled: ScheduledRow[];
}) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [scheduled, setScheduled] = useState(initialScheduled);

  async function handleDelete(id: string) {
    await deleteDraft(id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleCancel(id: string) {
    await cancelScheduledEmail(id);
    setScheduled((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "CANCELADO" } : s))
    );
  }

  return (
    <div className="space-y-6 p-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Borradores
        </h3>
        {drafts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No tienes borradores guardados.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {d.subject || "(sin asunto)"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    Para: {d.to || "—"} · Guardado {formatDate(d.updatedAt)}
                  </p>
                </div>
                <Link
                  href={`/correos/new?draft=${d.id}`}
                  className="shrink-0 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Envíos programados
        </h3>
        {scheduled.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No tienes correos programados.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {scheduled.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {s.subject}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    Para: {s.to} ·{" "}
                    {formatDate(s.scheduledFor)} ·{" "}
                    <span
                      className={
                        s.status === "PENDIENTE"
                          ? "font-medium text-indigo-600"
                          : s.status === "ERROR"
                            ? "font-medium text-rose-600"
                            : "text-gray-400"
                      }
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    {s.error ? ` (${s.error})` : ""}
                  </p>
                </div>
                {s.status === "PENDIENTE" ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(s.id)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Los envíos programados salen automáticamente cuando abres el CRM o
          mediante el endpoint /api/cron/scheduled si configuras un cron.
        </p>
      </section>
    </div>
  );
}
