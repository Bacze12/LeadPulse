"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { mailboxFormSchema, sendEmailSchema } from "@/lib/definitions";
import {
  listInbox,
  listInboxPage,
  readMessage,
  sendMail,
  toggleFlagged,
  type InboxMessage,
  type InboxPage,
  type ReadMessage,
} from "@/lib/mail";
import { emitN8n } from "@/lib/n8n";
import { parseEmails } from "@/lib/emails";
import { sanitizeSignatureHtml } from "@/lib/sanitize";

export type MailActionState = { error?: string; ok?: boolean } | undefined;

async function getOwnMailbox() {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });
  if (!mailbox) return null;
  return mailbox;
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

async function markLeadsContactado(recipients: string[]) {
  if (recipients.length === 0) return;
  const leads = await prisma.lead.findMany({
    where: { status: "NUEVO" },
    select: { id: true, name: true, email: true },
  });
  for (const lead of leads) {
    const leadEmails = parseEmails(lead.email).map((e) => e.toLowerCase());
    if (leadEmails.some((e) => recipients.includes(e))) {
      const updated = await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "CONTACTADO" },
      });
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

export async function sendEmail(
  _prev: MailActionState,
  formData: FormData
): Promise<MailActionState> {
  const mailbox = await getOwnMailbox();
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
  });
  if (!parsed.success) {
    return { error: "Revisa los campos: destinatario, asunto y mensaje." };
  }

  const data = parsed.data;
  const signature = (data.signature ?? mailbox.signature ?? "").trim();
  const sigHtml = /<[a-z!][^>]*>/i.test(signature)
    ? sanitizeSignatureHtml(signature)
    : escapeHtml(signature).replace(/\n/g, "<br/>");
  const html = signature
    ? `${data.message.replace(/\s+$/, "")}<br/><br/>${sigHtml}`
    : data.message;
  const text = htmlToText(html);

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

  try {
    await sendMail(mailbox, {
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      text,
      html,
      attachments,
      inReplyTo: data.inReplyTo,
      references: data.references,
    });
  } catch (e) {
    console.error("Error enviando correo:", e);
    return { error: "No se pudo enviar el correo. Verifica la configuración de la casilla." };
  }

  const recipients = [
    ...parseEmails(data.to),
    ...parseEmails(data.cc),
    ...parseEmails(data.bcc),
  ].map((e) => e.toLowerCase());
  await markLeadsContactado(recipients);

  return { ok: true };
}

export async function readMessageAction(
  mailboxId: string,
  uid: number
): Promise<ReadMessage | null> {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findFirst({
    where: { id: mailboxId, userId: user.id },
  });
  if (!mailbox) return null;
  return readMessage(mailbox, uid);
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