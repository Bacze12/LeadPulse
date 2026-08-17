import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type EmailAddress } from "mailparser";
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
  snippet: string;
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
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
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

function firstAddress(
  addr: EmailAddress[] | undefined
): EmailAddress | undefined {
  if (!addr || addr.length === 0) return undefined;
  return addr[0];
}

function mailAddressList(
  addr: AddressObject | AddressObject[] | undefined
): EmailAddress[] | undefined {
  if (!addr) return undefined;
  if (Array.isArray(addr)) {
    return addr.flatMap((a) => a.value ?? []);
  }
  return addr.value ?? [];
}

async function sourceToText(source: unknown): Promise<string> {
  if (typeof source === "string") return source;
  if (Buffer.isBuffer(source)) return source.toString("utf8");
  const chunks: Buffer[] = [];
  for await (const chunk of source as AsyncIterable<
    Buffer | Uint8Array | string
  >) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function listInbox(
  mailbox: MailboxLike,
  limit = 30
): Promise<InboxMessage[]> {
  const client = new ImapFlow(imapConfig(mailbox));
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const status = await client.status("INBOX", { messages: true });
      const total = status.messages ?? 0;
      const start = Math.max(1, total - limit + 1);
      const messages: InboxMessage[] = [];
      for await (const msg of client.fetch(`${start}:*`, {
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
          snippet: "",
        });
      }
      messages.sort((a, b) => b.date.getTime() - a.date.getTime());
      return messages.slice(0, limit);
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
        source: true,
      });
      if (!msg || !msg.source) return null;
      const raw = await sourceToText(msg.source);
      const parsed = await simpleParser(raw);
      const from = firstAddress(mailAddressList(parsed.from));
      const to = firstAddress(mailAddressList(parsed.to));
      const references = parsed.references
        ? Array.isArray(parsed.references)
          ? parsed.references.join(" ")
          : parsed.references
        : null;
      return {
        uid,
        from: addressLabel(from),
        fromAddress: from?.address ?? "",
        to: to?.address ?? "",
        subject: parsed.subject ?? "(sin asunto)",
        date: parsed.date ?? new Date(),
        text: parsed.text ?? "",
        html: parsed.html || null,
        messageId: parsed.messageId || null,
        inReplyTo: parsed.inReplyTo || null,
        references,
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
      html: opts.html,
      attachments: opts.attachments,
      inReplyTo: opts.inReplyTo ?? undefined,
      references: opts.references ?? undefined,
    });
  } finally {
    transport.close();
  }
}