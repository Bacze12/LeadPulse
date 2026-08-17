"use client";

import { useState, useActionState } from "react";
import { sendEmail } from "@/actions/mail";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

type ComposeProps = {
  triggerLabel?: string;
  defaultTo?: string;
  defaultSubject?: string;
  defaultOpen?: boolean;
  reply?: {
    subject: string;
    messageId: string | null;
    references: string | null;
    text: string;
  } | null;
};

function quoteOriginal(text: string): string {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

export function EmailCompose({
  triggerLabel = "Nuevo correo",
  defaultTo,
  defaultSubject,
  defaultOpen = false,
  reply,
}: ComposeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(sendEmail, undefined);
  const isReply = Boolean(reply);

  const subject = reply
    ? reply.subject.toLowerCase().startsWith("re:")
      ? reply.subject
      : `Re: ${reply.subject}`
    : (defaultSubject ?? "");

  const to = defaultTo ?? "";
  const body = reply ? `\n\n--\n${quoteOriginal(reply.text.trim())}` : "";

  if (!open) {
    return (
      <Button type="button" variant={isReply ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {isReply ? "Responder" : triggerLabel}
      </Button>
    );
  }

  return (
    <div>
      <form action={action} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        {state?.error ? (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}
        {state?.ok ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Correo enviado correctamente.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label htmlFor="email-to">Para</Label>
            <Input id="email-to" name="to" type="email" required defaultValue={to} placeholder="cliente@empresa.cl" />
          </div>
          <div>
            <Label htmlFor="email-cc">CC</Label>
            <Input id="email-cc" name="cc" type="email" placeholder="copia@empresa.cl" />
          </div>
          <div>
            <Label htmlFor="email-bcc">CCO</Label>
            <Input id="email-bcc" name="bcc" type="email" placeholder="oculta@empresa.cl" />
          </div>
        </div>

        <div>
          <Label htmlFor="email-subject">Asunto</Label>
          <Input id="email-subject" name="subject" required defaultValue={subject} placeholder="Asunto del correo" />
        </div>
        <div>
          <Label htmlFor="email-message">Mensaje</Label>
          <Textarea id="email-message" name="message" required rows={8} defaultValue={body} placeholder="Escribe el mensaje..." />
          <p className="mt-1 text-xs text-gray-400">
            Tu firma se agrega automáticamente al enviar.
          </p>
        </div>
        <div>
          <Label htmlFor="email-attachments">Adjuntos</Label>
          <input
            id="email-attachments"
            name="attachments"
            type="file"
            multiple
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
        </div>

        {reply ? (
          <>
            <input type="hidden" name="inReplyTo" value={reply.messageId ?? ""} />
            <input type="hidden" name="references" value={reply.references ?? ""} />
          </>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Enviar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </div>
      </form>
    </div>
  );
}