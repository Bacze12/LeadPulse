"use client";

import { useState } from "react";
import Link from "next/link";
import { parseEmails } from "@/lib/emails";

export function EmailLink({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const emails = parseEmails(value);

  if (emails.length === 0) return null;

  const base = className ?? "text-indigo-600 hover:text-indigo-800 hover:underline";

  if (emails.length === 1) {
    return (
      <Link href={`/correos/new?to=${encodeURIComponent(emails[0])}`} className={base} title="Enviar correo">
        {value}
      </Link>
    );
  }

  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={base} title="Selecciona a quién escribir">
        {value} <span className="text-xs">(elegir…)</span>
      </button>
      {open ? (
        <span
          className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {emails.map((email) => (
            <Link
              key={email}
              href={`/correos/new?to=${encodeURIComponent(email)}`}
              onClick={() => setOpen(false)}
              className="block truncate rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {email}
            </Link>
          ))}
        </span>
      ) : null}
    </span>
  );
}