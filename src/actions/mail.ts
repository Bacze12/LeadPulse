"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { mailboxFormSchema, sendEmailSchema } from "@/lib/definitions";
import {
  listInbox,
  listInboxPage,
  listFolderPage,
  readMessage,
  sendMail,
  saveSentCopy,
  resolveSentPath,
  toggleFlagged,
  type InboxMessage,
  type InboxPage,
  type MailboxLike,
  type ReadMessage,
} from "@/lib/mail";
import { emitN8n } from "@/lib/n8n";
import { parseEmails } from "@/lib/emails";
import { sanitizeSignatureHtml } from "@/lib/sanitize";
import { notifyUser } from "@/lib/notifications";

export type MailActionState = {
  error?: string;
  ok?: boolean;
  message?: string;
} | undefined;

async function getOwnMailbox() {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });
  return { user, mailbox };
}

export async function saveMailbox(
  _prev: MailActionState,
  formData: FormData
): Promise<MailActionState> {
  const user = await requireUser();

  const parsed = mailboxFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    signature: formData.get("signature"),
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
  });
  if (!parsed.success) {
    return { error: "Revisa los datos de la casilla (correo y contraseña son obligatorios)." };
  }

  const data = parsed.data;
  const current = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });
  const password = data.password || current?.password;

  await prisma.mailbox.upsert({
    where: { userId: user.id },
    update: {
      name: data.name,
      email: data.email,
      password,
      signature: data.signature,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
    },
    create: {
      userId: user.id,
      name: data.name,
      email: data.email,
      password: password ?? "",
      signature: data.signature,
      imapHost: data.imapHost,
      imapPort: data.imapPort,
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
    },
  });

  revalidatePath("/correos");
  return { ok: true };
}

export async function deleteMailbox(): Promise<MailActionState> {
  const user = await requireUser();
  await prisma.mailbox.deleteMany({ where: { userId: user.id } });
  revalidatePath("/correos");
  return { ok: true };
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSignatureHtml(signature: string | null | undefined): string {
  const trimmed = (signature ?? "").trim();
  if (!trimmed) return "";
  if (/<[a-z!][^>]*>/i.test(trimmed)) {
    return sanitizeSignatureHtml(trimmed);
  }
  return escapeHtml(trimmed).replace(/\n/g, "<br/>");
}

async function markLeadsContactado(recipients: string[]) {
  if (recipients.length === 0) return;
  const leads = await prisma.lead.findMany({
    where: { status: "NUEVO" },
    select: { id: true, name: true, email: true, assignedToId: true },
  });
  for (const lead of leads) {
    const leadEmails = parseEmails(lead.email).map((e) => e.toLowerCase());
    if (leadEmails.some((e) => recipients.includes(e))) {
      const updated = await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "CONTACTADO" },
      });
      if (updated.assignedToId) {
        await notifyUser({
          userId: updated.assignedToId,
          title: `Lead "${updated.name}" pasó a CONTACTADO`,
          body: "Se envió un correo al lead desde el CRM.",
          link: `/leads/${updated.id}`,
        });
      }
      await emitN8n({
        event: "lead.status_changed",
        entity: "lead",
        data: { id: updated.id, name: updated.name, status: updated.status },
      });
    }
  }
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

async function deliverEmail(
  mailbox: MailboxLike,
  input: {
    to: string;
    cc?: string | null;
    bcc?: string | null;
    subject: string;
    message: string;
    signature?: string | null;
    inReplyTo?: string | null;
    references?: string | null;
  },
  attachments: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[] = []
): Promise<void> {
  const sigHtml = buildSignatureHtml(input.signature ?? mailbox.signature);
  const html = sigHtml
    ? `${input.message.replace(/\s+$/, "")}<br/><br/>${sigHtml}`
    : input.message;
  const text = htmlToText(html);

  const { raw } = await sendMail(mailbox, {
    to: input.to,
    cc: input.cc ?? undefined,
    bcc: input.bcc ?? undefined,
    subject: input.subject,
    text,
    html,
    attachments,
    inReplyTo: input.inReplyTo ?? null,
    references: input.references ?? null,
  });
  await saveSentCopy(mailbox, raw).catch(() => {});
}

function parseSchedule(value: string | null | undefined): Date | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export async function sendEmail(
  _prev: MailActionState,
  formData: FormData
): Promise<MailActionState> {
  const { user, mailbox } = await getOwnMailbox();
  if (!mailbox) {
    return { error: "Configura tu casilla de correo primero." };
  }

  const parsed = sendEmailSchema.safeParse({
    to: formData.get("to"),
    cc: formData.get("cc"),
    bcc: formData.get("bcc"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    signature: formData.get("signature"),
    inReplyTo: formData.get("inReplyTo"),
    references: formData.get("references"),
    scheduleAt: formData.get("scheduleAt"),
    draftId: formData.get("draftId"),
  });
  if (!parsed.success) {
    return { error: "Revisa los campos: destinatario, asunto y mensaje." };
  }

  const data = parsed.data;

  let scheduledFor: Date | null = null;
  const scheduleRaw = (data.scheduleAt ?? "").trim();
  if (scheduleRaw) {
    scheduledFor = parseSchedule(scheduleRaw);
    if (!scheduledFor) {
      return { error: "La fecha de programación no es válida." };
    }
    if (scheduledFor.getTime() < Date.now() - 60_000) {
      return { error: "No puedes programar un envío en el pasado." };
    }
  }

  try {
    if (scheduledFor) {
      await prisma.scheduledEmail.create({
        data: {
          userId: user.id,
          status: "PENDIENTE",
          scheduledFor,
          to: data.to,
          cc: data.cc ?? null,
          bcc: data.bcc ?? null,
          subject: data.subject,
          message: data.message,
          signature: data.signature ?? null,
          inReplyTo: data.inReplyTo ?? null,
          references: data.references ?? null,
        },
      });
      revalidatePath("/correos");
      return {
        ok: true,
        message: `Correo programado para ${scheduledFor.toLocaleString("es-MX")}.`,
      };
    }

    const files = formData
      .getAll("attachments")
      .filter((v): v is File => v instanceof File);
    const attachments = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        content: Buffer.from(await file.arrayBuffer()),
        contentType: file.type || undefined,
      }))
    );

    await deliverEmail(mailbox, {
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      message: data.message,
      signature: data.signature ?? null,
      inReplyTo: data.inReplyTo ?? null,
      references: data.references ?? null,
    }, attachments);
  } catch (e) {
    console.error("Error enviando correo:", e);
    return { error: "No se pudo enviar el correo. Verifica la configuración de la casilla." };
  }

  if (data.draftId) {
    await prisma.emailDraft
      .deleteMany({ where: { id: data.draftId, userId: user.id } })
      .catch(() => {});
  }

  const recipients = [
    ...parseEmails(data.to),
    ...parseEmails(data.cc),
    ...parseEmails(data.bcc),
  ].map((e) => e.toLowerCase());
  await markLeadsContactado(recipients);
  revalidatePath("/correos");

  return { ok: true };
}

export async function readMessageAction(
  mailboxId: string,
  uid: number,
  folder = "inbox"
): Promise<ReadMessage | null> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return null;
  let target = "INBOX";
  if (folder === "sent") {
    const sentPath = await resolveSentPath(mailbox);
    if (!sentPath) return null;
    target = sentPath;
  }
  return readMessage(mailbox, uid, target);
}

export async function refreshInbox(
  mailboxId: string,
  limit = 30
): Promise<InboxMessage[]> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return [];
  return listInbox(mailbox, limit);
}

export async function inboxPage(
  mailboxId: string,
  page: number,
  limit = 30
): Promise<InboxPage> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return { messages: [], total: 0, page, limit };
  return listInboxPage(mailbox, page, limit);
}

export async function sentPage(
  mailboxId: string,
  page: number,
  limit = 30
): Promise<InboxPage> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return { messages: [], total: 0, page, limit };
  try {
    const sentPath = await resolveSentPath(mailbox);
    if (!sentPath) return { messages: [], total: 0, page, limit };
    return await listFolderPage(mailbox, sentPath, page, limit);
  } catch (e) {
    console.error("Error leyendo enviados:", e);
    return { messages: [], total: 0, page, limit };
  }
}

export async function inboxPreview(
  mailboxId: string,
  limit = 100
): Promise<InboxMessage[]> {
  const page = await inboxPage(mailboxId, 1, limit);
  return page.messages;
}

export async function toggleImportant(
  mailboxId: string,
  uid: number,
  flagged: boolean
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return { ok: false };
  try {
    await toggleFlagged(mailbox, uid, flagged);
    return { ok: true };
  } catch (e) {
    console.error("Error marcando importante:", e);
    return { ok: false };
  }
}

export async function saveDraft(
  formData: FormData
): Promise<{ ok?: boolean; id?: string; error?: string }> {
  const user = await requireUser();

  const get = (key: string): string | null => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== ""
      ? value.trim()
      : null;
  };

  const data = {
    userId: user.id,
    to: get("to"),
    cc: get("cc"),
    bcc: get("bcc"),
    subject: get("subject"),
    message: get("message"),
    signature: get("signature"),
    inReplyTo: get("inReplyTo"),
    references: get("references"),
  };

  if (!data.to && !data.subject && !data.message && !data.signature) {
    return { error: "El borrador está vacío." };
  }

  const draftId = get("draftId");
  if (draftId) {
    const existing = await prisma.emailDraft.findFirst({
      where: { id: draftId, userId: user.id },
    });
    if (existing) {
      await prisma.emailDraft.update({ where: { id: existing.id }, data });
      revalidatePath("/correos");
      return { ok: true, id: existing.id };
    }
  }

  const created = await prisma.emailDraft.create({ data });
  revalidatePath("/correos");
  return { ok: true, id: created.id };
}

export async function deleteDraft(id: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.emailDraft.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/correos");
  return { ok: true };
}

export async function cancelScheduledEmail(
  id: string
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await prisma.scheduledEmail.updateMany({
    where: { id, userId: user.id, status: "PENDIENTE" },
    data: { status: "CANCELADO" },
  });
  revalidatePath("/correos");
  return { ok: true };
}

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function processDueScheduledEmails(): Promise<number> {
  const due = await prisma.scheduledEmail.findMany({
    where: { status: "PENDIENTE", scheduledFor: { lte: new Date() } },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });

  let sentCount = 0;
  for (const item of due) {
    try {
      const mailbox = await prisma.mailbox.findUnique({
        where: { userId: item.userId },
      });
      if (!mailbox) throw new Error("Casilla no configurada");
      await deliverEmail(mailbox, {
        to: item.to,
        cc: item.cc,
        bcc: item.bcc,
        subject: item.subject,
        message: item.message,
        signature: item.signature,
        inReplyTo: item.inReplyTo,
        references: item.references,
      });
      await prisma.scheduledEmail.update({
        where: { id: item.id },
        data: { status: "ENVIADO", sentAt: new Date(), error: null },
      });
      sentCount += 1;

      const recipients = [
        ...parseEmails(item.to),
        ...parseEmails(item.cc),
        ...parseEmails(item.bcc),
      ].map((e) => e.toLowerCase());
      await markLeadsContactado(recipients);
      revalidatePath("/correos");
      revalidatePath("/leads");
      revalidatePath("/dashboard");
    } catch (e) {
      const stale =
        Date.now() - item.scheduledFor.getTime() > STALE_AFTER_MS;
      await prisma.scheduledEmail
        .update({
          where: { id: item.id },
          data: {
            error: e instanceof Error ? e.message.slice(0, 500) : "Error",
            ...(stale ? { status: "ERROR" } : {}),
          },
        })
        .catch(() => {});
    }
  }
  return sentCount;
}