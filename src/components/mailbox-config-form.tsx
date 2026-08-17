"use client";

import { useState, useActionState, useTransition } from "react";
import { saveMailbox, deleteMailbox } from "@/actions/mail";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { TITAN_DEFAULTS } from "@/lib/constants";

type MailboxConfigFormProps = {
  mailbox?: {
    id: string;
    name: string;
    email: string;
    signature: string | null;
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
  } | null;
};

export function MailboxConfigForm({ mailbox }: MailboxConfigFormProps) {
  const [state, action, pending] = useActionState(saveMailbox, undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | undefined>();

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        {state?.error ? (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}
        {state?.ok ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Casilla guardada. Ya puedes ver y enviar correos.
          </div>
        ) : null}

        <div>
          <Label htmlFor="mb-name">Nombre (opcional)</Label>
          <Input id="mb-name" name="name" defaultValue={mailbox?.name ?? "Mi casilla"} placeholder="Mi casilla" />
        </div>
        <div>
          <Label htmlFor="mb-email">Correo de la casilla *</Label>
          <Input id="mb-email" name="email" type="email" required defaultValue={mailbox?.email ?? ""} placeholder="nombre@arkonsecurity.cl" />
        </div>
        <div>
          <Label htmlFor="mb-password">Contraseña de la casilla *</Label>
          <Input id="mb-password" name="password" type="password" defaultValue={mailbox ? undefined : ""} placeholder={mailbox ? "•••••••• (déjalo en blanco para mantener)" : "Clave de Titan"} />
          <p className="mt-1 text-xs text-gray-400">
            Se guarda en la base de datos y se usa solo para IMAP y SMTP de Titan.
          </p>
        </div>
        <div>
          <Label htmlFor="mb-signature">Firma (se agrega a cada correo)</Label>
          <Textarea
            id="mb-signature"
            name="signature"
            rows={4}
            placeholder={"Atentamente,\nBruno Castillo\nArkon Security\n+56 9 ..."}
            defaultValue={mailbox?.signature ?? ""}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="mb-imap-host">Servidor IMAP</Label>
            <Input id="mb-imap-host" name="imapHost" defaultValue={mailbox?.imapHost ?? TITAN_DEFAULTS.imapHost} />
          </div>
          <div>
            <Label htmlFor="mb-imap-port">Puerto IMAP</Label>
            <Input id="mb-imap-port" name="imapPort" type="number" defaultValue={mailbox?.imapPort ?? TITAN_DEFAULTS.imapPort} />
          </div>
          <div>
            <Label htmlFor="mb-smtp-host">Servidor SMTP</Label>
            <Input id="mb-smtp-host" name="smtpHost" defaultValue={mailbox?.smtpHost ?? TITAN_DEFAULTS.smtpHost} />
          </div>
          <div>
            <Label htmlFor="mb-smtp-port">Puerto SMTP</Label>
            <Input id="mb-smtp-port" name="smtpPort" type="number" defaultValue={mailbox?.smtpPort ?? TITAN_DEFAULTS.smtpPort} />
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : mailbox ? "Guardar cambios" : "Guardar casilla"}
        </Button>
      </form>

      {mailbox ? (
        <div className="border-t border-gray-100 pt-4">
          {deleteError ? (
            <div className="mb-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {deleteError}
            </div>
          ) : null}
          <Button
            type="button"
            variant="danger"
            disabled={deleting}
            onClick={() => {
              if (window.confirm("¿Eliminar la casilla de correo?")) {
                startDelete(async () => {
                  const result = await deleteMailbox();
                  setDeleteError(result?.error);
                });
              }
            }}
          >
            {deleting ? "Eliminando..." : "Eliminar casilla"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}