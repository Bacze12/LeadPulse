import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { deleteLead } from "@/actions/leads";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { DeleteButton } from "@/components/delete-button";
import { LeadStatusSelect } from "@/components/lead-status-select";
import { AssigneeSelect } from "@/components/assignee-select";
import { InteractionForm } from "@/components/interaction-form";
import { DeleteInteractionButton } from "@/components/delete-interaction-button";
import { TaskItem } from "@/components/task-item";
import { EmailList } from "@/components/email-list";
import { listInbox, type InboxMessage } from "@/lib/mail";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  VISIT_STATUS_LABELS,
  VISIT_STATUS_STYLES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPE_STYLES,
} from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

type ExtraContact = { type?: string; value?: string };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [lead, users] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        visits: { orderBy: { scheduledFor: "desc" } },
        quotes: { orderBy: { createdAt: "desc" } },
        interactions: {
          orderBy: { createdAt: "desc" },
          include: { createdBy: { select: { id: true, name: true } } },
        },
        tasks: {
          orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
          include: { lead: { select: { id: true, name: true } } },
        },
        assignedTo: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!lead) notFound();

  const extraContacts: ExtraContact[] = Array.isArray(lead.extraContacts)
    ? (lead.extraContacts as ExtraContact[])
    : [];

  const leadEmails = new Set<string>();
  const addEmails = (value?: string | null) => {
    if (!value) return;
    value
      .split(/[\s,;]+/)
      .map((v) => v.trim().toLowerCase())
      .filter((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      .forEach((v) => leadEmails.add(v));
  };
  addEmails(lead.email);
  extraContacts.forEach((c) => {
    if (c.type === "email") addEmails(c.value);
  });

  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });
  let relatedEmails: InboxMessage[] = [];
  if (mailbox && leadEmails.size > 0) {
    try {
      const inbox = await listInbox(mailbox, 100);
      relatedEmails = inbox.filter(
        (m) =>
          leadEmails.has(m.fromAddress.toLowerCase()) ||
          leadEmails.has(m.toAddress.toLowerCase())
      );
    } catch {
      relatedEmails = [];
    }
  }

  type ContactRow = {
  label: string;
  value: string | null | undefined;
  href?: string;
  email?: boolean;
  to?: string;
};

const contactRows: ContactRow[] = [
    { label: "Empresa", value: lead.company },
    {
      label: "Email",
      value: lead.email,
      email: true,
      to: lead.email ? lead.email.split(/[\s,;]+/)[0] : undefined,
    },
    { label: "Teléfono", value: lead.phone },
    { label: "Sitio web", value: lead.website, href: lead.website ?? undefined },
    { label: "Origen", value: lead.source },
    { label: "Message ID", value: lead.messageId },
    { label: "Creado", value: formatDate(lead.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <Badge
              label={LEAD_STATUS_LABELS[lead.status]}
              className={LEAD_STATUS_STYLES[lead.status]}
            />
          </div>
          {lead.company ? (
            <p className="mt-1 text-sm text-gray-500">{lead.company}</p>
          ) : null}
          {lead.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/visits/new?leadId=${lead.id}`} variant="secondary">
            Agendar visita
          </LinkButton>
          <LinkButton href={`/quotes/new?leadId=${lead.id}`} variant="secondary">
            Crear cotización
          </LinkButton>
          <LinkButton href={`/tasks/new?leadId=${lead.id}`} variant="secondary">
            Nueva tarea
          </LinkButton>
          <LinkButton href={`/leads/${lead.id}/edit`} variant="secondary">
            Editar
          </LinkButton>
          <DeleteButton
            label="Eliminar"
            onDelete={deleteLead.bind(null, lead.id)}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Estado" description="Cambia el estado del lead en el pipeline" />
          <div className="space-y-4 p-5">
            <LeadStatusSelect leadId={lead.id} status={lead.status} />
            <div>
              <p className="mb-1 block text-sm font-medium text-gray-700">
                Asignado a
              </p>
              <AssigneeSelect
                leadId={lead.id}
                assignedToId={lead.assignedToId}
                users={users}
              />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Información de contacto" />
          <dl className="divide-y divide-gray-100 px-5">
            {contactRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500">{row.label}</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {row.email && row.to ? (
                    <Link
                      href={`/correos/new?to=${encodeURIComponent(row.to)}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {row.value ?? "—"}
                    </Link>
                  ) : row.href ? (
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      {row.value ?? "—"}
                    </a>
                  ) : (
                    (row.value ?? "—")
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {extraContacts.length > 0 ? (
            <div className="border-t border-gray-100 px-5 py-3">
              <p className="text-sm font-medium text-gray-900">
                Contactos adicionales
              </p>
              <ul className="mt-2 space-y-1">
                {extraContacts.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Badge
                      label={c.type === "email" ? "Email" : "Teléfono"}
                      className={
                        c.type === "email"
                          ? "bg-indigo-100 text-indigo-800"
                          : "bg-sky-100 text-sky-800"
                      }
                    />
                    {c.value ?? ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      {lead.notes ? (
        <Card>
          <CardHeader title="Notas" />
          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{lead.notes}</p>
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Historial de interacciones"
          description="Llamadas, WhatsApp, correos y notas de seguimiento"
        />
        <div className="border-b border-gray-100 p-5">
          <InteractionForm leadId={lead.id} />
        </div>
        {lead.interactions.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">
            Sin interacciones registradas.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lead.interactions.map((interaction) => (
              <li key={interaction.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="flex items-start gap-3">
                  <Badge
                    label={INTERACTION_TYPE_LABELS[interaction.type] ?? interaction.type}
                    className={INTERACTION_TYPE_STYLES[interaction.type] ?? ""}
                  />
                  <div>
                    <p className="text-sm text-gray-700">{interaction.content}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDate(interaction.createdAt)} ·{" "}
                      {new Date(interaction.createdAt).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {interaction.createdBy ? ` · ${interaction.createdBy.name}` : ""}
                    </p>
                  </div>
                </div>
                <DeleteInteractionButton id={interaction.id} leadId={lead.id} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {leadEmails.size > 0 ? (
        <Card>
          <CardHeader
            title="Correos del lead"
            description={
              mailbox
                ? "Bandeja filtrada por los correos de este contacto"
                : "Configura tu casilla de correo en la sección Correos"
            }
            action={
              mailbox ? (
                <LinkButton
                  href={`/correos/new?to=${encodeURIComponent(Array.from(leadEmails)[0])}`}
                  variant="secondary"
                >
                  Enviar correo
                </LinkButton>
              ) : undefined
            }
          />
          {!mailbox ? (
            <p className="px-5 py-6 text-sm text-gray-500">
              Sin casilla configurada: ve a <Link href="/correos">Correos</Link>{" "}
              para conectar tu cuenta de Titan.
            </p>
          ) : relatedEmails.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500">
              No hay correos asociados a este lead aún.
            </p>
          ) : (
            <EmailList mailboxId={mailbox.id} messages={relatedEmails} />
          )}
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Tareas"
          description="Recordatorios y follow-ups para este lead"
          action={
            <LinkButton href={`/tasks/new?leadId=${lead.id}`} variant="secondary">
              Nueva tarea
            </LinkButton>
          }
        />
        {lead.tasks.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">
            No hay tareas para este lead.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lead.tasks.map((task) => (
              <TaskItem key={task.id} task={task} showLead={false} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Visitas técnicas"
          description="Visitas agendadas para este lead"
        />
        {lead.visits.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">
            No hay visitas registradas.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lead.visits.map((visit) => (
              <li key={visit.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(visit.scheduledFor)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {visit.technicianName
                      ? `Técnico: ${visit.technicianName}`
                      : "Sin técnico asignado"}
                    {visit.address ? ` · ${visit.address}` : ""}
                  </p>
                </div>
                <Badge
                  label={VISIT_STATUS_LABELS[visit.status]}
                  className={VISIT_STATUS_STYLES[visit.status]}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Cotizaciones"
          description="Cotizaciones generadas para este lead"
        />
        {lead.quotes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-500">
            No hay cotizaciones registradas.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lead.quotes.map((quote) => (
              <li key={quote.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <Link
                    href="/quotes"
                    className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                  >
                    {formatCurrency(quote.amount, quote.currency)}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {formatDate(quote.createdAt)}
                    {quote.description ? ` · ${quote.description}` : ""}
                  </p>
                </div>
                <Badge
                  label={QUOTE_STATUS_LABELS[quote.status]}
                  className={QUOTE_STATUS_STYLES[quote.status]}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}