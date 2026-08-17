"use client";

import { useActionState } from "react";
import { authenticate } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function LoginForm() {
  const [error, action, pending] = useActionState(authenticate, undefined);

  return (
    <form action={action} className="space-y-4">
      {error ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}