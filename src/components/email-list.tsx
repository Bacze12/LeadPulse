"use client";

import { useState } from "react";
import { readMessageAction } from "@/actions/mail";
import { EmailCompose } from "@/components/email-compose";
import { EmailHtml } from "@/components/email-html";
import { MarkdownText } from "@/components/markdown-text";
import { formatDate } from "@/lib/format";
import type { InboxMessage } from "@/lib/mail";

export type RelatedEmailMessage = InboxMessage & { folder?: "inbox" | "sent" };

export function EmailList({
  mailboxId,
  messages,
  signature,
}: {
  mailboxId: string;
  messages: RelatedEmailMessage[];
  signature?: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof readMessageAction>> | null>(null);
  const [loading, setLoading] = useState(false);

  const keyOf = (m: RelatedEmailMessage) => `${m.folder ?? "inbox"}-${m.uid}`;

  async function toggle(m: RelatedEmailMessage) {
    const key = keyOf(m);
    if (expanded === key) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(key);
    setDetail(null);
    setLoading(true);
    try {
      const result = await readMessageAction(mailboxId, m.uid, m.folder ?? "inbox");
      setDetail(result);
    } finally {
      setLoading(false);
    }
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500">
        No hay correos asociados a este lead todavía.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {messages.map((m) => {
        const key = keyOf(m);
        return (
        <li key={key}>
          <button
            type="button"
            onClick={() => toggle(m)}
            className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-gray-50"
          >
            <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              {m.folder === "sent" ? "Enviado" : "Recibido"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {m.folder === "sent" ? `Para: ${m.toAddress || m.from}` : m.from}
              </span>
              <span className="block truncate text-sm text-gray-500">
                {m.subject}
              </span>
              {m.snippet ? (
                <span className="block truncate text-xs text-gray-400">
                  {m.snippet}
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-gray-400">
              {formatDate(m.date)}
            </span>
          </button>

          {expanded === key ? (
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
              {loading ? (
                <p className="text-sm text-gray-500">Cargando correo...</p>
              ) : detail ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-white p-4 text-sm text-gray-800">
                    <p className="mb-1">
                      <span className="font-medium">De:</span> {detail.from}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Para:</span> {detail.to}
                    </p>
                    <p className="mb-1">
                      <span className="font-medium">Asunto:</span>{" "}
                      {detail.subject}
                    </p>
                    <p className="mb-3 text-xs text-gray-400">
                      {formatDate(detail.date)}
                    </p>
                    {detail.attachments.length > 0 ? (
                      <div className="mb-3 space-y-2">
                        {detail.attachments.map((a) => (
                          <a
                            key={a.partId}
                            href={`/api/mail/attachment?uid=${detail.uid}&partId=${encodeURIComponent(a.partId)}${(m.folder ?? "") === "sent" ? "&folder=sent" : ""}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                            title={`Descargar ${a.filename}`}
                          >
                            <span className="min-w-0 truncate">
                              📎 {a.filename}
                            </span>
                            <span className="shrink-0 text-xs text-gray-400">
                              {a.size > 0
                                ? `${(a.size / 1024).toFixed(1)} KB`
                                : ""}{" "}
                              ⬇
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {detail.html ? (
                      <EmailHtml html={detail.html} height="48vh" />
                    ) : (
                      <MarkdownText
                        text={detail.text}
                        className="whitespace-pre-wrap text-sm text-gray-800"
                      />
                    )}
                  </div>
                  {(m.folder ?? "inbox") === "inbox" ? (
                    <EmailCompose
                      reply={{
                        subject: detail.subject,
                        messageId: detail.messageId,
                        references: detail.references,
                        text: detail.text,
                      }}
                      defaultTo={detail.fromAddress}
                      signature={signature ?? undefined}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-rose-600">
                  No se pudo leer el correo.
                </p>
              )}
            </div>
          ) : null}
        </li>
        );
      })}
    </ul>
  );
}