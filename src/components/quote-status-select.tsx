"use client";

import { useTransition } from "react";
import { updateQuoteStatus } from "@/actions/quotes";
import { QUOTE_STATUSES, QUOTE_STATUS_LABELS } from "@/lib/constants";
import { Select } from "@/components/ui/field";

export function QuoteStatusSelect({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        if (
          next === "APROBADA" &&
          !window.confirm(
            "¿Confirmas que la cotización fue aprobada? El lead se marcará como ganado."
          )
        ) {
          return;
        }
        startTransition(() => {
          void updateQuoteStatus(quoteId, next);
        });
      }}
    >
      {QUOTE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {QUOTE_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}