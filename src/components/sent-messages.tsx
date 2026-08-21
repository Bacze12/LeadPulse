"use client";

import { useState } from "react";
import { readMessageAction, sentPage } from "@/actions/mail";
import { EmailHtml } from "@/components/email-html";
import { MarkdownText } from "@/components/markdown-text";
import { formatDate } from "@/lib/format";
import type { InboxMessage } from "@/lib/mail";

const PAGE_SIZE = 30;

export function SentMessages({
  mailboxId,
  initialMessages,
  initialTotal,
  emptyHint,
}: {
  mailboxId: string;
  initialMessages: InboxMessage[];
  initialTotal: number;
  emptyHint?: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<
    ReturnType<typeof readMessageAction>
  > | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function loadPage(p: number) {
    setLoading(true);
    try {
      const data = await sentPage(mailboxId, Math.max(1, p), PAGE_SIZE);
      setMessages(data.messages);
      setTotal(data.total);
      setPage(Math.max(1, p));
    } finally {
      setLoading(false);
    }
  }

  async function open(uid: number) {
    setExpanded(uid);
    setDetail(null);
    setLoading(true);
    try {
      const result = await readMessageAction(mailboxId, uid, "sent");
      setDetail(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {messages.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-gray-500">
          {emptyHint ?? "No hay correos enviados todavía."}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {messages.map((m) => (
            <li key={m.uid}>
              <button
                type="button"
                onClick={() => (expanded === m.uid ? (setExpanded(null), setDetail(null)) : open(m.uid))}
                className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-gray-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900">
                    Para: {m.toAddress || m.from}
                  </span>
                  <span className="block truncate text-sm text-gray-500">
                    {m.subject}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDate(m.date)}
                </span>
              </button>

              {expanded === m.uid ? (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                  {loading && expanded === m.uid && !detail ? (
                    <p className="text-sm text-gray-500">Cargando correo...</p>
                  ) : detail ? (
                    <div className="rounded-lg bg-white p-4 text-sm text-gray-800">
                      <p className="mb-1">
                        <span className="font-medium">Para:</span> {detail.to || detail.fromAddress}
                      </p>
                      <p className="mb-1">
                        <span className="font-medium">Asunto:</span> {detail.subject}
                      </p>
                      <p className="mb-3 text-xs text-gray-400">{formatDate(detail.date)}</p>
                      {detail.attachments.length > 0 ? (
                        <div className="mb-3 space-y-2">
                          {detail.attachments.map((a) => (
                            <a
                              key={a.partId}
                              href={`/api/mail/attachment?uid=${detail.uid}&partId=${encodeURIComponent(a.partId)}&folder=sent`}
                              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                            >
                              <span className="min-w-0 truncate">📎 {a.filename}</span>
                              <span className="shrink-0 text-xs text-gray-400">
                                {a.size > 0 ? `${(a.size / 1024).toFixed(1)} KB` : ""} ⬇
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
                  ) : (
                    <p className="text-sm text-rose-600">No se pudo leer el correo.</p>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between border-t border-gray-100 p-3">
          <p className="text-xs text-gray-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadPage(page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              ← Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => loadPage(page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
