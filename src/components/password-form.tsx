"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      {state?.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Contraseña actualizada correctamente.
        </div>
      ) : null}

      <div>
        <Label htmlFor="current-password">Contraseña actual</Label>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div>
        <Label htmlFor="new-password">Nueva contraseña</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="mt-1 text-xs text-gray-400">
          Mínimo 8 caracteres. Si usas una clave temporal, cámbiala aquí.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </Button>
    </form>
  );
}