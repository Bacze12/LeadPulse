"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ComposeEmailButton({
  emails,
  label = "Enviar correo",
  variant = "secondary",
}: {
  emails: string[];
  label?: string;
  variant?: "secondary" | "primary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const list = Array.from(new Set(emails.map((e) => e.toLowerCase())));

  if (list.length === 0) return null;

  const cls =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors " +
    (variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700"
      : "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50");

  if (list.length === 1) {
    return (
      <button
        type="button"
        className={cls}
        onClick={() => router.push(`/correos/new?to=${encodeURIComponent(list[0])}`)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="relative inline-block">
      <button type="button" className={cls} onClick={() => setOpen((v) => !v)}>
        {label} (elegir…)
      </button>
      {open ? (
        <span
          className="absolute right-0 top-full z-20 mt-1 min-w-[240px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {list.map((email) => (
            <button
              key={email}
              type="button"
              onClick={() => router.push(`/correos/new?to=${encodeURIComponent(email)}`)}
              className="block w-full truncate rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
            >
              {email}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}