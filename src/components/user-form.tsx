"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

export function UserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="space-y-4">
      {state?.error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      {state?.tempPassword ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="font-medium">{state.success}</p>
          <p className="mt-1">
            Contraseña temporal:{" "}
            <strong className="font-mono">{state.tempPassword}</strong>
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            El usuario deberá cambiarla al iniciar sesión.
          </p>
        </div>
      ) : null}

      <div>
        <Label htmlFor="user-name">Nombre</Label>
        <Input
          id="user-name"
          name="name"
          required
          placeholder="Nombre del usuario"
        />
      </div>

      <div>
        <Label htmlFor="user-email">Correo</Label>
        <Input
          id="user-email"
          name="email"
          type="email"
          required
          placeholder="nombre@arkonsecurity.cl"
        />
        <p className="mt-1 text-xs text-gray-400">
          Solo se permiten correos del dominio @arkonsecurity.cl
        </p>
      </div>

      <div>
        <Label htmlFor="user-role">Rol</Label>
        <Select id="user-role" name="role" defaultValue="VENDEDOR">
          <option value="VENDEDOR">Vendedor</option>
          <option value="TECNICO">Técnico</option>
          <option value="ADMIN">Administrador</option>
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creando..." : "Crear usuario"}
      </Button>
    </form>
  );
}