"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readMessageAction, refreshInbox } from "@/actions/mail";
import { EmailCompose } from "@/components/email-compose";
import { formatDate } from "@/lib/format";
import type { InboxMessage } from "@/lib/mail";

const PAGE_SIZE = 30;
const POLL_MS = 60_000;

export function EmailInbox({
  mailboxId,
  initialMessages,
}: {
  mailboxId: string;
  initialMessages: InboxMessage[];
}) {
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof readMessageAction>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const busyRef = useRef(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(
      (m) =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.fromAddress.toLowerCase().includes(q)
    );
  }, [messages, search]);

  const visible = filtered.slice(0, visibleCount);

  async function open(uid: number) {
    setSelected(uid);
    setDetail(null);
    setLoading(true);
    try {
      const result = await readMessageAction(mailboxId, uid);
      setDetail(result);
      setMessages((prev) => prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m)));
    } finally {
      setLoading(false);
    }
  }

  async function checkInbox() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const fresh = await refreshInbox(mailboxId, PAGE_SIZE);
      const known = new Set(messages.map((m) => m.uid));
      const freshUnseen = fresh.filter((m) => !known.has(m.uid));
      if (freshUnseen.length > 0) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.uid, m]));
          fresh.forEach((m) => map.set(m.uid, m));
          return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
        });
        const unreadNew = freshUnseen.filter((m) => !m.seen).length;
        if (unreadNew > 0) setNewCount((c) => c + unreadNew);
      }
    } finally {
      busyRef.current = false;
    }
  }

  useEffect(() => {
    const id = setInterval(checkInbox, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return (
    <div className="grid min-h-[60vh] grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <div className="flex flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
        <div className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por remitente o asunto..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>
              {messages.length} correos · {filtered.length} visibles
            </span>
            <button
              type="button"
              onClick={checkInbox}
              className="font-medium text-indigo-600 hover:underline"
            >
              Actualizar
            </button>
          </div>
          {newCount > 0 ? (
            <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              {newCount} correo{newCount > 1 ? "s" : ""} nuevo{newCount > 1 ? "s" : ""}.{" "}
              <button type="button" onClick={checkInbox} className="font-semibold underline">
                Ver
              </button>
            </div>
          ) : null}
        </div>

        <ul className="max-h-[65vh] divide-y divide-gray-100 overflow-y-auto lg:max-h-none">
          {visible.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              {messages.length === 0
                ? "No hay correos en la bandeja."
                : "Sin resultados para tu búsqueda."}
            </li>
          ) : (
            visible.map((m) => {
              const active = selected === m.uid;
              return (
                <li key={m.uid}>
                  <button
                    type="button"
                    onClick={() => open(m.uid)}
                    className={
                      "flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50" +
                      (active ? " bg-indigo-50" : m.seen ? "" : " bg-white")
                    }
                  >
                    <span
                      className={
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full" +
                        (m.seen ? " bg-transparent" : " bg-indigo-500")
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className={"block truncate text-sm" + (m.seen ? " text-gray-600" : " font-semibold text-gray-900")}>
                        {m.from}
                      </span>
                      <span className={"block truncate text-sm" + (m.seen ? " text-gray-500" : " font-medium text-gray-800")}>
                        {m.subject}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(m.date)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {filtered.length > visibleCount ? (
          <div className="border-t border-gray-100 p-3">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cargar más ({filtered.length - visibleCount} restantes)
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col bg-gray-50">
        {selected === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-gray-500">
              Selecciona un correo para leerlo en esta vista.
            </p>
            <EmailCompose triggerLabel="+ Nuevo correo" />
          </div>
        ) : loading ? (
          <div className="flex-1 space-y-3 p-6">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
          </div>
        ) : detail ? (
          <div className="flex-1 space-y-4 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold text-gray-900">
                  {detail.subject}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  De: {detail.from}
                </p>
                {detail.to ? (
                  <p className="text-sm text-gray-500">Para: {detail.to}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDate(detail.date)}
                </p>
              </div>
              <div className="flex gap-2">
                <EmailCompose
                  reply={{
                    subject: detail.subject,
                    messageId: detail.messageId,
                    references: detail.references,
                    text: detail.text,
                  }}
                  defaultTo={detail.fromAddress}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    setDetail(null);
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100"
                >
                  Volver
                </button>
              </div>
            </div>
            <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-800">
              {detail.text}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 text-sm text-rose-600">
            No se pudo leer el correo.
          </div>
        )}
      </div>
    </div>
  );
}