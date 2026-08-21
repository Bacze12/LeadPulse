"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { inboxPage, readMessageAction, toggleImportant as toggleImportantAction } from "@/actions/mail";
import { EmailCompose } from "@/components/email-compose";
import { EmailHtml } from "@/components/email-html";
import { MarkdownText } from "@/components/markdown-text";
import { formatDate } from "@/lib/format";
import type { InboxMessage } from "@/lib/mail";

const PAGE_SIZE = 30;
const POLL_MS = 60_000;

type Filter = "all" | "unread" | "flagged";

export function EmailInbox({
  mailboxId,
  initialMessages,
  initialTotal,
  initialPage,
  signature,
  savedSignatures = [],
  initialFilter = "all",
}: {
  mailboxId: string;
  initialMessages: InboxMessage[];
  initialTotal: number;
  initialPage: number;
  signature?: string | null;
  savedSignatures?: {
    id: string;
    name: string;
    content: string;
    isDefault?: boolean;
  }[];
  initialFilter?: Filter;
}) {
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof readMessageAction>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const busyRef = useRef(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadPage = useCallback(
    async (p: number) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLoading(true);
      try {
        const data = await inboxPage(mailboxId, Math.max(1, p), PAGE_SIZE);
        setMessages(data.messages);
        setTotal(data.total);
        setPage(Math.max(1, p));
        setNewCount(0);
        setLastUpdated(new Date());
      } finally {
        busyRef.current = false;
        setLoading(false);
      }
    },
    [mailboxId]
  );

  const checkInbox = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try {
      const data = await inboxPage(mailboxId, 1, PAGE_SIZE);
      const known = new Set(messages.map((m) => m.uid));
      const freshUnseen = data.messages.filter((m) => !known.has(m.uid));
      setTotal(data.total);
      if (page === 1) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.uid, m]));
          data.messages.forEach((m) => map.set(m.uid, m));
          return Array.from(map.values()).sort(
            (a, b) => b.date.getTime() - a.date.getTime()
          );
        });
      }
      if (freshUnseen.length > 0) {
        const unreadNew = freshUnseen.filter((m) => !m.seen).length;
        if (unreadNew > 0) setNewCount((c) => c + unreadNew);
      }
      setLastUpdated(new Date());
    } finally {
      busyRef.current = false;
      setRefreshing(false);
    }
  }, [mailboxId, messages, page]);

  useEffect(() => {
    const id = setInterval(checkInbox, POLL_MS);
    const onFocus = () => checkInbox();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkInbox]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === "unread" && m.seen) return false;
      if (filter === "flagged" && !m.flagged) return false;
      if (!q) return true;
      return (
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.fromAddress.toLowerCase().includes(q)
      );
    });
  }, [messages, search, filter]);

  async function open(uid: number) {
    setSelected(uid);
    setDetail(null);
    setDetailLoading(true);
    try {
      const result = await readMessageAction(mailboxId, uid);
      setDetail(result);
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, seen: true } : m))
      );
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggleImportant(uid: number, flagged: boolean) {
    const prevDetail = detail;
    setMessages((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, flagged } : m))
    );
    if (prevDetail && prevDetail.uid === uid) {
      setDetail({ ...prevDetail, flagged });
    }
    const res = await toggleImportantAction(mailboxId, uid, flagged);
    if (!res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, flagged: !flagged } : m))
      );
      if (prevDetail && prevDetail.uid === uid) {
        setDetail({ ...prevDetail, flagged: !flagged });
      }
    }
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "unread", label: "No leídos" },
    { id: "flagged", label: "Importantes" },
  ];

  return (
    <div className="grid min-h-[70vh] grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <div className="flex flex-col border-b border-gray-100 lg:border-b-0 lg:border-r">
        <div className="border-b border-gray-100 p-3">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por remitente o asunto..."
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={checkInbox}
              disabled={refreshing}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              title="Actualizar bandeja"
            >
              {refreshing ? "..." : "↻"}
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors" +
                  (filter === f.id
                    ? " bg-indigo-600 text-white"
                    : " bg-gray-100 text-gray-600 hover:bg-gray-200")
                }
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400">
              {total} correos
            </span>
          </div>

          {newCount > 0 ? (
            <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              {newCount} correo{newCount > 1 ? "s" : ""} nuevo{newCount > 1 ? "s" : ""}.{" "}
              <button
                type="button"
                onClick={() => loadPage(1)}
                className="font-semibold underline"
              >
                Ver
              </button>
            </div>
          ) : null}
        </div>

        <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto lg:max-h-[70vh]">
          {loading ? (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              Cargando correos...
            </li>
          ) : filtered.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-gray-500">
              {messages.length === 0
                ? "No hay correos en la bandeja."
                : "Sin resultados para tu búsqueda."}
            </li>
          ) : (
            filtered.map((m) => {
              const active = selected === m.uid;
              return (
                <li key={m.uid}>
                  <div
                    className={
                      "flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50" +
                      (active ? " bg-indigo-50" : m.seen ? "" : " bg-white")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => open(m.uid)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <span
                        className={
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full" +
                          (m.seen ? " bg-transparent" : " bg-indigo-500")
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            "block truncate text-sm" +
                            (m.seen ? " text-gray-600" : " font-semibold text-gray-900")
                          }
                        >
                          {m.from}
                        </span>
                        <span
                          className={
                            "block truncate text-sm" +
                            (m.seen ? " text-gray-500" : " font-medium text-gray-800")
                          }
                        >
                          {m.subject}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDate(m.date)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleImportant(m.uid, !m.flagged)}
                      title={m.flagged ? "Quitar importante" : "Marcar importante"}
                      className={
                        "shrink-0 text-base leading-none" +
                        (m.flagged ? " text-amber-400" : " text-gray-300 hover:text-amber-300")
                      }
                    >
                      ★
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 p-3">
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
        <p className="px-3 pb-3 text-xs text-gray-400">
          Actualizado {lastUpdated ? lastUpdated.toLocaleTimeString("es-MX") : "—"}
        </p>
      </div>

      <div className="flex flex-col bg-gray-50">
        {selected === null ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm text-gray-500">
              Selecciona un correo para leerlo en esta vista.
            </p>
            <Link
              href="/correos/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              + Nuevo correo
            </Link>
          </div>
        ) : detailLoading ? (
          <div className="flex-1 space-y-3 p-6">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
          </div>
        ) : detail ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 p-6 pb-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-semibold text-gray-900">
                  {detail.subject}
                </h2>
                <p className="mt-1 text-sm text-gray-600">De: {detail.from}</p>
                {detail.to ? (
                  <p className="text-sm text-gray-500">Para: {detail.to}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatDate(detail.date)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleImportant(detail.uid, !detail.flagged)}
                  title="Marcar como importante"
                  className={
                    "rounded-lg px-3 py-2 text-base" +
                    (detail.flagged
                      ? " text-amber-400"
                      : " text-gray-300 hover:text-amber-300")
                  }
                >
                  ★
                </button>
                <EmailCompose
                  reply={{
                    subject: detail.subject,
                    messageId: detail.messageId,
                    references: detail.references,
                    text: detail.text,
                  }}
                  defaultTo={detail.fromAddress}
                  signature={signature ?? undefined}
                  savedSignatures={savedSignatures}
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
            <div className="min-h-0 flex-1 overflow-y-auto p-6 pt-2">
              {detail.attachments.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {detail.attachments.map((a) => (
                    <a
                      key={a.partId}
                      href={`/api/mail/attachment?uid=${detail.uid}&partId=${encodeURIComponent(a.partId)}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                      title={`Descargar ${a.filename}`}
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
                <EmailHtml html={detail.html} />
              ) : (
                <MarkdownText
                  text={detail.text}
                  className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-800"
                />
              )}
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