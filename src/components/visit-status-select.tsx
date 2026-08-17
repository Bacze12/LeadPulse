"use client";

import { useTransition } from "react";
import { updateVisitStatus } from "@/actions/visits";
import { VISIT_STATUSES, VISIT_STATUS_LABELS } from "@/lib/constants";
import { Select } from "@/components/ui/field";

export function VisitStatusSelect({
  visitId,
  status,
}: {
  visitId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          void updateVisitStatus(visitId, e.target.value);
        })
      }
    >
      {VISIT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {VISIT_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}