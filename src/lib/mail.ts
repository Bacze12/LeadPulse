import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export type MailboxLike = {
  id: string;
  email: string;
  password: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
};

export type InboxMessage = {
  uid: number;
  from: string;
  fromAddress: string;
  toAddress: string;
  subject: string;
  date: Date;
  seen: boolean;
  flagged: boolean;
  snippet: string;
};

export type EmailAttachment = {
  filename: string;
  contentType: string;
  size: number;
  partId: string;
};

export type ReadMessage = {
  uid: number;
  from: string;
  fromAddress: string;
  to: string;
  subject: string;
  date: Date;
  text: string;
  html: string | null;
  flagged: boolean;
  attachments: EmailAttachment[];
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
};

export type InboxPage = {
  messages: InboxMessage[];
  total: number;
  page: number;
  limit: number;
};

function imapConfig(mailbox: MailboxLike) {
  return {
    host: mailbox.imapHost,
    port: mailbox.imapPort,
    secure: true,
    auth: { user: mailbox.email, pass: mailbox.password },
    logger: false as const,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
  };
}

function addressLabel(addr?: { name?: string; address?: string }): string {
  if (!addr) return "Desconocido";
  if (addr.name) return `${addr.name} <${addr.address ?? ""}>`;
  return addr.address ?? "Desconocido";
}

type ImapBodyPart = {
  type?: string;
  part?: string;
  size?: number;
  id?: string;
  disposition?: string | null;
  parameters?: Record<string, string>;
  dispositionParameters?: Record<string, string>;
  childNodes?: ImapBodyPart[];
};

function walkBodyParts(node: ImapBodyPart | undefined, out: ImapBodyPart[]) {
  if (!node) return;
  if (node.childNodes) {
    for (const child of node.childNodes) walkBodyParts(child, out);
  } else if (node.type) {
    out.push(node);
  }
}

function partParam(
  params: Record<string, string> | undefined,
  keys: string[]
): string | undefined {
  if (!params) return undefined;
  for (const key of keys) {
    const value = params[key];
    if (value) return value;
  }
  return undefined;
}

function isAttachmentPart(node: ImapBodyPart): boolean {
  const filename = partParam(
    node.dispositionParameters ?? node.parameters,
    ["filename", "name"]
  );
  if (!filename || !node.part) return false;
  const ct = (node.type ?? "").toLowerCase();
  if (node.disposition === "attachment") return true;
  if (ct === "text/plain" || ct === "text/html") return false;
  if (ct.startsWith("image/")) return false;
  if (ct.startsWith("multipart/") || ct === "message/rfc822") return false;
  return true;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseHeaderBuffer(
  buf: Buffer,
  names: string[]
): Map<string, string> {
  const out = new Map<string, string>();
  const wanted = new Set(names.map((n) => n.toLowerCase()));
  let currentKey: string | null = null;
  let currentValue = "";
  for (const line of buf.toString("utf8").split(/\r?\n/)) {
    if (!line || line === "") continue;
    if (/^[\t ]/.test(line)) {
      if (currentKey) currentValue += " " + line.trim();
      continue;
    }
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    if (currentKey) out.set(currentKey, currentValue);
    currentKey = wanted.has(key) ? key : null;
    currentValue = wanted.has(key) ? line.slice(idx + 1).trim() : "";
  }
  if (currentKey) out.set(currentKey, currentValue);
  return out;
}

async function collectStream(
  stream: AsyncIterable<Buffer | Uint8Array | string>
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function fetchRange(
  client: ImapFlow,
  startSeq: number,
  endSeq: number
): Promise<InboxMessage[]> {
  const messages: InboxMessage[] = [];
  for await (const msg of client.fetch(`${startSeq}:${endSeq}`, {
    uid: true,
    envelope: true,
    internalDate: true,
    flags: true,
  })) {
    const from = msg.envelope?.from?.[0];
    const to = msg.envelope?.to?.[0];
    messages.push({
      uid: msg.uid,
      from: addressLabel(from),
      fromAddress: from?.address ?? "",
      toAddress: to?.address ?? "",
      subject: msg.envelope?.subject ?? "(sin asunto)",
      date: new Date(msg.internalDate ?? Date.now()),
      seen: msg.flags?.has("\\Seen") ?? false,
      flagged: msg.flags?.has("\\Flagged") ?? false,
      snippet: "",
    });
  }
  messages.sort((a, b) => b.date.getTime() - a.date.getTime());
  return messages;
}

export async function listInboxPage(
  mailbox: MailboxLike,
  page = 1,
  limit = 30
): Promise<InboxPage> {
  const client = new ImapFlow(imapConfig(mailbox));
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages ?? 0;
      const startSeq = Math.max(1, total - page * limit + 1);
      const endSeq = Math.max(0, total - (page - 1) * limit);
      let messages: InboxMessage[] = [];
      if (endSeq >= startSeq) {
        messages = await fetchRange(client, startSeq, endSeq);
      }
      return { messages, total, page, limit };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function listInbox(
  mailbox: MailboxLike,
  limit = 30
): Promise<InboxMessage[]> {
  const { messages } = await listInboxPage(mailbox, 1, limit);
  return messages;
}

export async function toggleFlagged(
  mailbox: MailboxLike,
  uid: number,
  flagged: boolean
): Promise<void> {
  const client = new ImapFlow(imapConfig(mailbox));
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      if (flagged) {
        await client.messageFlagsAdd(String(uid), ["\\Flagged"], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), ["\\Flagged"], { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function readMessage(
  mailbox: MailboxLike,
  uid: number
): Promise<ReadMessage | null> {
  const client = new ImapFlow(imapConfig(mailbox));
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
        headers: ["message-id", "in-reply-to", "references"],
      });
      if (!msg || !msg.bodyStructure) return null;

      const parts: ImapBodyPart[] = [];
      walkBodyParts(msg.bodyStructure, parts);

      const attachments: EmailAttachment[] = parts
        .filter(isAttachmentPart)
        .map((p) => ({
          filename:
            partParam(p.dispositionParameters ?? p.parameters, [
              "filename",
              "name",
            ]) ?? `adjunto-${p.part}`,
          contentType: p.type || "application/octet-stream",
          size: p.size ?? 0,
          partId: p.part as string,
        }));

      let text = "";
      let html: string | null = null;

      const plainParts = parts.filter(
        (p) => p.type === "text/plain" && !!p.part
      );
      const htmlParts = parts.filter(
        (p) => p.type === "text/html" && !!p.part
      );

      for (const part of plainParts) {
        try {
          const res = await client.download(String(uid), part.part as string, {
            uid: true,
          });
          text += (await collectStream(res.content)).toString("utf8") + "\n";
        } catch {
          // ignore unreadable text parts
        }
      }

      if (htmlParts.length > 0) {
        const htmlChunks: string[] = [];
        for (const part of htmlParts) {
          try {
            const res = await client.download(String(uid), part.part as string, {
              uid: true,
            });
            htmlChunks.push(
              (await collectStream(res.content)).toString("utf8")
            );
          } catch {
            // ignore unreadable html parts
          }
        }
        html = htmlChunks.join("\n") || null;
      }

      if (html) {
        const imageParts = parts.filter(
          (p) => p.type?.startsWith("image/") && !!p.id && !!p.part
        );
        const cidMap = new Map<string, string>();
        for (const img of imageParts) {
          try {
            const res = await client.download(String(uid), img.part as string, {
              uid: true,
            });
            const data = await collectStream(res.content);
            const cid = img.id?.replace(/^<|>$/g, "") ?? "";
            if (cid) cidMap.set(cid, `data:${img.type};base64,${data.toString("base64")}`);
          } catch {
            // ignore unreadable inline images
          }
        }
        if (cidMap.size > 0) {
          html = html.replace(/cid:([^"'\s>]+)/gi, (m, cidRaw: string) => {
            const cid = String(cidRaw).replace(/^<|>$/g, "");
            return cidMap.get(cid) ?? m;
          });
        }
        if (plainParts.length === 0) {
          text = stripHtml(html);
        }
      }

      const from = msg.envelope?.from?.[0];
      const to = msg.envelope?.to?.[0];
      const headerMap = msg.headers
        ? parseHeaderBuffer(msg.headers, ["message-id", "in-reply-to", "references"])
        : new Map<string, string>();
      const header = (name: string): string | null =>
        headerMap.get(name.toLowerCase()) ?? null;

      return {
        uid,
        from: addressLabel(from),
        fromAddress: from?.address ?? "",
        to: to?.address ?? "",
        subject: msg.envelope?.subject ?? "(sin asunto)",
        date: new Date(msg.internalDate ?? Date.now()),
        text: text.trim(),
        html,
        flagged: msg.flags?.has("\\Flagged") ?? false,
        attachments,
        messageId: header("message-id"),
        inReplyTo: header("in-reply-to"),
        references: header("references"),
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function downloadAttachment(
  mailbox: MailboxLike,
  uid: number,
  partId: string
): Promise<{ filename: string; contentType: string; content: Buffer } | null> {
  const client = new ImapFlow(imapConfig(mailbox));
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const res = await client.download(String(uid), partId, { uid: true });
      const content = await collectStream(res.content);
      return {
        filename:
          res.meta.filename ||
          `adjunto-${partId}`.replace(/[\\/:*?"<>|]/g, "_"),
        contentType: res.meta.contentType || "application/octet-stream",
        content,
      };
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function sendMail(
  mailbox: MailboxLike,
  opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    cc?: string;
    bcc?: string;
    attachments?: { filename: string; content: Buffer; contentType?: string }[];
    inReplyTo?: string | null;
    references?: string | null;
  }
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: mailbox.smtpHost,
    port: mailbox.smtpPort,
    secure: true,
    auth: { user: mailbox.email, pass: mailbox.password },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
  });
  try {
    await transport.sendMail({
      from: `"${mailbox.email}" <${mailbox.email}>`,
      to: opts.to,
      cc: opts.cc,
      bcc: opts.bcc,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? undefined,
      attachments: opts.attachments,
      inReplyTo: opts.inReplyTo ?? undefined,
      references: opts.references ?? undefined,
    });
  } finally {
    transport.close();
  }
}