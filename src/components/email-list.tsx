"use client";

import { useState } from "react";
import { readMessageAction } from "@/actions/mail";
import { EmailCompose } from "@/components/email-compose";
import { formatDate } from "@/lib/format";
import type { InboxMessage } from "@/lib/mail";

export function EmailList({
  mailboxId,
  messages,
}: {
  mailboxId: string;
  messages: InboxMessage[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof readMessageAction>> | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle(uid: number) {
    if (expanded === uid) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(uid);
    setDetail(null);
    setLoading(true);
    try {
      const result = await readMessageAction(mailboxId, uid);
      setDetail(result);
    } finally {
      setLoading(false);
    }
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500">
        No hay correos en la bandeja de entrada.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {messages.map((m) => (
        <li key={m.uid}>
          <button
            type="button"
            onClick={() => toggle(m.uid)}
            className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-gray-50"
          >
            <span
              className={
                m.seen
                  ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent"
                  : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
              }
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {m.from}
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

          {expanded === m.uid ? (
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
                    <div className="whitespace-pre-wrap">{detail.text}</div>
                  </div>
                  <EmailCompose
                    reply={{
                      subject: detail.subject,
                      messageId: detail.messageId,
                      references: detail.references,
                      text: detail.text,
                    }}
                    defaultTo={detail.fromAddress}
                  />
                </div>
              ) : (
                <p className="text-sm text-rose-600">
                  No se pudo leer el correo.
                </p>
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}