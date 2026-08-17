"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  onDelete,
  label = "Eliminar",
}: {
  onDelete: () => Promise<unknown>;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (window.confirm("¿Eliminar? Esta acción no se puede deshacer.")) {
          startTransition(() => {
            void onDelete();
          });
        }
      }}
    >
      {pending ? "Eliminando..." : label}
    </Button>
  );
}