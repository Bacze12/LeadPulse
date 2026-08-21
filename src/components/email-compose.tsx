"use client";

import { useActionState, useRef, useState } from "react";
import { saveDraft, sendEmail } from "@/actions/mail";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { sanitizeSignatureHtml } from "@/lib/sanitize";

export type ComposeDraft = {
  id: string;
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  message?: string | null;
  signature?: string | null;
};

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
  draft?: ComposeDraft | null;
};

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EmailCompose({
  triggerLabel = "Nuevo correo",
  defaultTo,
  defaultSubject,
  defaultOpen = false,
  signature,
  savedSignatures = [],
  reply,
  draft,
}: ComposeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [state, action, pending] = useActionState(sendEmail, undefined);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const sigImageRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isReply = Boolean(reply);
  const isDraft = Boolean(draft);
  const [draftId, setDraftId] = useState(draft?.id ?? "");
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleDefault, setScheduleDefault] = useState("");
  const [signatureValue, setSignatureValue] = useState(
    () =>
      draft?.signature ||
      savedSignatures.find((s) => s.isDefault)?.content ||
      signature ||
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

  async function handleSaveDraft() {
    const form = formRef.current;
    if (!form || savingDraft) return;
    setSavingDraft(true);
    try {
      const res = await saveDraft(new FormData(form));
      if (res.ok && res.id) {
        setDraftId(res.id);
        setDraftStatus("Borrador guardado.");
      } else {
        setDraftStatus(res.error ?? "No se pudo guardar el borrador.");
      }
    } catch {
      setDraftStatus("No se pudo guardar el borrador.");
    } finally {
      setSavingDraft(false);
    }
  }

  const subject = reply
    ? reply.subject.toLowerCase().startsWith("re:")
      ? reply.subject
      : `Re: ${reply.subject}`
    : (defaultSubject ?? draft?.subject ?? "");

  const to = defaultTo ?? draft?.to ?? "";
  const defaultCc = draft?.cc ?? "";
  const defaultBcc = draft?.bcc ?? "";
  const replyBody = reply
    ? `\n\n--\n${reply.text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}`
    : "";
  const defaultMessage = draft?.message ?? replyBody;

  if (!open) {
    return (
      <Button type="button" variant={isReply || isDraft ? "secondary" : "primary"} onClick={() => setOpen(true)}>
        {isReply ? "Responder" : triggerLabel}
      </Button>
    );
  }

  return (
    <div>
      <form ref={formRef} action={action} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        {state?.error ? (
          <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {state.error}
          </div>
        ) : null}
        {state?.ok ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {state.message ?? "Correo enviado correctamente."}
          </div>
        ) : null}
        {!state?.ok && !state?.error && draftStatus ? (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs text-indigo-700">
            {draftStatus}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <Label htmlFor="email-to">Para</Label>
            <Input id="email-to" name="to" required defaultValue={to} placeholder="cliente@empresa.cl (varios con coma)" />
          </div>
          <div>
            <Label htmlFor="email-cc">CC</Label>
            <Input id="email-cc" name="cc" defaultValue={defaultCc} placeholder="copia@empresa.cl" />
          </div>
          <div>
            <Label htmlFor="email-bcc">CCO</Label>
            <Input id="email-bcc" name="bcc" defaultValue={defaultBcc} placeholder="oculta@empresa.cl" />
          </div>
        </div>

        <div>
          <Label htmlFor="email-subject">Asunto</Label>
          <Input id="email-subject" name="subject" required defaultValue={subject} placeholder="Asunto del correo" />
        </div>
        <div>
          <Label>Mensaje</Label>
          <RichTextEditor name="message" defaultValue={defaultMessage} rows={8} />
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

        <input type="hidden" name="inReplyTo" value={reply?.messageId ?? ""} />
        <input type="hidden" name="references" value={reply?.references ?? ""} />
        <input type="hidden" name="draftId" value={draftId} />

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={scheduleOn}
              onChange={(e) => {
                setScheduleOn(e.target.checked);
                if (e.target.checked) {
                  setScheduleDefault(
                    formatDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000))
                  );
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Programar envío (ej. enviar mañana en la mañana)
          </label>
          {scheduleOn ? (
            <div className="mt-2">
              <Input
                type="datetime-local"
                name="scheduleAt"
                required
                defaultValue={scheduleDefault}
              />
              <p className="mt-1 text-xs text-gray-400">
                El correo se enviará automáticamente a la hora indicada.
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Enviar"}
          </Button>
          <Button type="button" variant="secondary" disabled={savingDraft || pending} onClick={handleSaveDraft}>
            {savingDraft ? "Guardando..." : "Guardar borrador"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </div>
      </form>
    </div>
  );
}