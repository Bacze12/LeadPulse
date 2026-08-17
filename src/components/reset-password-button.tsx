"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "@/actions/users";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setTempPassword(null);
          startTransition(() => {
            void resetUserPassword(userId).then((res) => {
              if (res.tempPassword) setTempPassword(res.tempPassword);
              if (res.error) setError(res.error);
            });
          });
        }}
      >
        {pending ? "Generando..." : "Generar clave temporal"}
      </Button>
      {tempPassword ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Clave temporal: <strong className="font-mono">{tempPassword}</strong>
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}