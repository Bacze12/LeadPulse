"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmailLink } from "@/components/email-link";

export type LeadRow = {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  emails: string[];
  statusLabel: string;
  statusClass: string;
  assignedName?: string | null;
  createdAtLabel: string;
};

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const selectableIds = useMemo(
    () => rows.filter((r) => r.emails.length > 0).map((r) => r.id),
    [rows]
  );

  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(selectableIds);
    }
  }

  const selectedEmails = Array.from(
    new Set(
      rows
        .filter((r) => selected.includes(r.id))
        .flatMap((r) => r.emails)
    )
  );

  if (rows.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        No hay leads con estos filtros.
      </div>
    );
  }

  return (
    <div className="relative">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={selectableIds.length === 0}
                title="Seleccionar todos los que tienen correo"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Lead
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Contacto
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Estado
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Asignado
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              Creado
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-4">
                {row.emails.length > 0 ? (
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                ) : null}
              </td>
              <td className="px-5 py-4">
                <Link
                  href={`/leads/${row.id}`}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                >
                  {row.name}
                </Link>
                <p className="text-xs text-gray-500">
                  {row.company ?? "Sin empresa"}
                </p>
              </td>
              <td className="px-5 py-4">
                <p className="text-sm text-gray-700">{row.phone ?? "—"}</p>
                {row.emails[0] ? (
                  <EmailLink value={row.emails[0]} className="text-xs text-indigo-600 hover:underline" />
                ) : (
                  <p className="text-xs text-gray-500">Sin correo</p>
                )}
              </td>
              <td className="px-5 py-4">
                <Badge label={row.statusLabel} className={row.statusClass} />
              </td>
              <td className="px-5 py-4 text-sm text-gray-700">
                {row.assignedName ?? "—"}
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">
                {row.createdAtLabel}
              </td>
              <td className="px-5 py-4 text-right">
                <Link
                  href={`/leads/${row.id}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Ver →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 bg-indigo-50 px-5 py-3">
          <p className="text-sm font-medium text-indigo-900">
            {selected.length} lead{selected.length > 1 ? "s" : ""} seleccionado
            {selected.length > 1 ? "s" : ""} · {selectedEmails.length} correo
            {selectedEmails.length > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            {selectedEmails.length > 0 ? (
              <a
                href={`/correos/new?to=${encodeURIComponent(selectedEmails.join(", "))}`}
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Enviar correo a seleccionados
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-sm font-medium text-indigo-700 hover:bg-white/70"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
