"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toggleTask, deleteTask } from "@/actions/tasks";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { TASK_ACTION_LABELS, TASK_ACTION_STYLES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

type TaskItemData = {
  id: string;
  title: string;
  actionType: string;
  dueDate: Date | string;
  completed: boolean;
  notes: string | null;
  lead: { id: string; name: string };
};

export function TaskItem({
  task,
  showLead = true,
}: {
  task: TaskItemData;
  showLead?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const due = new Date(task.dueDate);
  const overdue = !task.completed && due < new Date();

  return (
    <li className="flex items-start justify-between gap-3 px-5 py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void toggleTask(task.id, !task.completed);
            })
          }
          aria-label={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold transition-colors disabled:opacity-50 ${
            task.completed
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-gray-300 bg-white hover:border-indigo-400"
          }`}
        >
          {task.completed ? "✓" : ""}
        </button>

        <div>
          <p
            className={`text-sm font-medium ${
              task.completed
                ? "text-gray-400 line-through"
                : overdue
                  ? "text-rose-700"
                  : "text-gray-900"
            }`}
          >
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Badge
              label={TASK_ACTION_LABELS[task.actionType] ?? task.actionType}
              className={TASK_ACTION_STYLES[task.actionType] ?? ""}
            />
            <span className={overdue ? "font-medium text-rose-600" : ""}>
              Vence: {formatDateTime(task.dueDate)}
              {overdue ? " · Atrasada" : ""}
            </span>
            {showLead ? (
              <Link
                href={`/leads/${task.lead.id}`}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {task.lead.name}
              </Link>
            ) : null}
          </div>
          {task.notes ? (
            <p className="mt-1 text-xs text-gray-500">{task.notes}</p>
          ) : null}
        </div>
      </div>

      <DeleteButton onDelete={() => deleteTask(task.id)} label="Eliminar" />
    </li>
  );
}