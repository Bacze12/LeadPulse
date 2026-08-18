"use client";

import { useActionState, useRef, useState } from "react";
import { sendEmail } from "@/actions/mail";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { sanitizeSignatureHtml } from "@/lib/sanitize";

type ComposeProps = {
  triggerLabel?: string;
  defaultTo?: string;
  defaultSubject?: string;
  defaultOpen?: boolean;
  signature?: string;
  savedSignatures?: {
    id: string;
    name: string;
    content: string;
    isDefault?: boolean;
  }[];
  reply?: {
    subject: string;
    messageId: string | null;
    references: string | null;
    text: string;
  } | null;
};

export function EmailCompose({
  triggerLabel = "Nuevo correo",
  defaultTo,
  defaultSubject,
  defaultOpen = false,
  signature,
  savedSignatures = [],
  reply,
}: ComposeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(sendEmail, undefined);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const sigImageRef = useRef<HTMLInputElement>(null);
  const isReply = Boolean(reply);
  const [signatureValue, setSignatureValue] = useState(
    () =>
      savedSignatures.find((s) => s.isDefault)?.content ??
      signature ??
      ""
  );

  function insertSignatureImage(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureValue(
        (v) =>
          `${v}\n<img src="${reader.result as string}" style="max-width:220px;height:auto;" alt="firma"/>\n`
      );
    };
    reader.readAsDataURL(file);
  }

  const subject = reply
    ? reply.subject.toLowerCase().startsWith("re:")
      ? reply.subject
      : `Re: ${reply.subject}`
    : (defaultSubject ?? "");

  const to = defaultTo ?? "";
  const replyBody = reply
    ? `\n\n--\n${reply.text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`
    : "";

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
            <Input id="email-to" name="to" required defaultValue={to} placeholder="cliente@empresa.cl (varios con coma)" />
          </div>
          <div>
            <Label htmlFor="email-cc">CC</Label>
            <Input id="email-cc" name="cc" placeholder="copia@empresa.cl" />
          </div>
          <div>
            <Label htmlFor="email-bcc">CCO</Label>
            <Input id="email-bcc" name="bcc" placeholder="oculta@empresa.cl" />
          </div>
        </div>

        <div>
          <Label htmlFor="email-subject">Asunto</Label>
          <Input id="email-subject" name="subject" required defaultValue={subject} placeholder="Asunto del correo" />
        </div>
        <div>
          <Label>Mensaje</Label>
          <RichTextEditor name="message" defaultValue={replyBody} rows={8} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="email-signature">Firma (opcional)</Label>
            <button
              type="button"
              onClick={() => sigImageRef.current?.click()}
              className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Insertar imagen
            </button>
            <input
              ref={sigImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) insertSignatureImage(file);
                e.target.value = "";
              }}
            />
          </div>
          {savedSignatures.length > 0 ? (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  setSignatureValue(e.target.value);
                  e.target.value = "";
                }
              }}
              className="mb-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Usar una firma guardada...</option>
              {savedSignatures.map((s) => (
                <option key={s.id} value={s.content}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <Textarea
            id="email-signature"
            name="signature"
            rows={3}
            value={signatureValue}
            onChange={(e) => setSignatureValue(e.target.value)}
            placeholder={"Atentamente,\nTu nombre\nArkon Security"}
          />
          <p className="mt-1 text-xs text-gray-400">
            Si la dejas en blanco se envía sin firma. Puedes gestionar firmas
            guardadas en la página de Correos.
          </p>
          {signatureValue.trim() ? (
            <div
              className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
              dangerouslySetInnerHTML={{
                __html: sanitizeSignatureHtml(signatureValue),
              }}
            />
          ) : null}
        </div>
        <div>
          <Label htmlFor="email-attachments">Adjuntos</Label>
          <input
            id="email-attachments"
            name="attachments"
            type="file"
            multiple
            ref={fileRef}
            onChange={(e) =>
              setFileNames(Array.from(e.target.files ?? []).map((f) => f.name))
            }
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
          />
          {fileNames.length > 0 ? (
            <p className="mt-1 text-xs text-gray-500">
              {fileNames.length} archivo{fileNames.length > 1 ? "s" : ""}:
              <span className="ml-1 font-medium text-gray-700">
                {fileNames.join(", ")}
              </span>
            </p>
          ) : null}
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