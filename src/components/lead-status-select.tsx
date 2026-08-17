"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "@/actions/leads";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { Select } from "@/components/ui/field";

export function LeadStatusSelect({
  leadId,
  status,
}: {
  leadId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          void updateLeadStatus(leadId, e.target.value);
        })
      }
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {LEAD_STATUS_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}