"use client";

import { useTransition } from "react";
import { deleteInteraction } from "@/actions/interactions";

export function DeleteInteractionButton({
  id,
  leadId,
}: {
  id: string;
  leadId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm("¿Eliminar esta interacción?")) {
          startTransition(() => {
            void deleteInteraction(id, leadId);
          });
        }
      }}
      className="text-xs font-medium text-gray-400 transition-colors hover:text-rose-600 disabled:opacity-50"
    >
      {pending ? "..." : "Eliminar"}
    </button>
  );
}