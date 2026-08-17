"use client";

import { useTransition } from "react";
import { assignLead } from "@/actions/leads";
import { Select } from "@/components/ui/field";

type UserOption = { id: string; name: string; email: string };

export function AssigneeSelect({
  leadId,
  assignedToId,
  users,
}: {
  leadId: string;
  assignedToId: string | null;
  users: UserOption[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={assignedToId ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          void assignLead(leadId, e.target.value);
        })
      }
    >
      <option value="">Sin asignar</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </Select>
  );
}