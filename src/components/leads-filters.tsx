"use client";

import { useRouter } from "next/navigation";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";

export function LeadsFilters({
  status,
  assigned,
  users,
}: {
  status?: string;
  assigned?: string;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();

  function apply(next: { status?: string; assigned?: string }) {
    const params = new URLSearchParams();
    const s = next.status ?? status ?? "";
    const a = next.assigned ?? assigned ?? "";
    if (s) params.set("status", s);
    if (a) params.set("assigned", a);
    const qs = params.toString();
    router.push(qs ? `/leads?${qs}` : "/leads");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-gray-500"
        >
          Estado
        </label>
        <select
          id="filter-status"
          value={status ?? ""}
          onChange={(e) => apply({ status: e.target.value })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="filter-assigned"
          className="text-xs font-medium text-gray-500"
        >
          Asignado
        </label>
        <select
          id="filter-assigned"
          value={assigned ?? ""}
          onChange={(e) => apply({ assigned: e.target.value })}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Todos</option>
          <option value="__none">Sin asignar</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {status || assigned ? (
        <button
          type="button"
          onClick={() => apply({ status: "", assigned: "" })}
          className="text-xs font-medium text-indigo-600 hover:underline"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );
}
