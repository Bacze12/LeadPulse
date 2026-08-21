import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { inboxPage, processDueScheduledEmails, sentPage } from "@/actions/mail";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { MailboxConfigForm } from "@/components/mailbox-config-form";
import { EmailInbox } from "@/components/email-inbox";
import { SentMessages } from "@/components/sent-messages";
import {
  DraftsList,
  type DraftRow,
  type ScheduledRow,
} from "@/components/drafts-list";
import { SignaturesManager } from "@/components/signatures-manager";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "recibidos", label: "Recibidos" },
  { id: "importantes", label: "Importantes" },
  { id: "enviados", label: "Enviados" },
  { id: "borradores", label: "Borradores" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function CorreosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === sp.tab)
    ? (sp.tab as TabId)
    : "recibidos";

  await processDueScheduledEmails().catch(() => {});

  const [mailbox, signatures] = await Promise.all([
    prisma.mailbox.findUnique({
      where: { userId: user.id },
    }),
    prisma.signature.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  let inbox: Awaited<ReturnType<typeof inboxPage>> = {
    messages: [],
    total: 0,
    page: 1,
    limit: 100,
  };
  let inboxError: string | null = null;
  let sent: Awaited<ReturnType<typeof sentPage>> = {
    messages: [],
    total: 0,
    page: 1,
    limit: 50,
  };

  if (mailbox) {
    try {
      inbox = await inboxPage(mailbox.id, 1, 100);
    } catch (e) {
      console.error("Error leyendo buzón:", e);
      inboxError =
        "No se pudo conectar a la casilla. Verifica que la dirección y la contraseña sean correctas.";
    }
    if (tab === "enviados") {
      try {
        sent = await sentPage(mailbox.id, 1, 50);
      } catch (e) {
        console.error("Error leyendo enviados:", e);
      }
    }
  }

  const drafts: DraftRow[] =
    tab === "borradores"
      ? await prisma.emailDraft.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  const scheduled: ScheduledRow[] =
    tab === "borradores"
      ? await prisma.scheduledEmail.findMany({
          where: { userId: user.id, status: "PENDIENTE" },
          orderBy: { scheduledFor: "asc" },
        })
      : [];

  if (!mailbox) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Conecta tu casilla de Titan (IMAP + SMTP) para ver y responder
            correos desde el CRM. Cada usuario conecta su propia cuenta.
          </p>
        </div>
        <Card>
          <CardHeader title="Configurar casilla de correo" />
          <div className="px-5 py-4">
            <MailboxConfigForm />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correos</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <Badge label={mailbox.email} className="bg-indigo-100 text-indigo-800" />
            Bandeja de entrada (IMAP)
          </p>
        </div>
        <LinkButton href="/correos/new">+ Nuevo correo</LinkButton>
      </div>

      {inboxError ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {inboxError}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/correos?tab=${t.id}`}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors" +
              (tab === t.id
                ? " bg-indigo-600 text-white"
                : " bg-gray-100 text-gray-600 hover:bg-gray-200")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "recibidos" || tab === "importantes" ? (
        <Card className="overflow-hidden p-0">
          <EmailInbox
            mailboxId={mailbox.id}
            initialMessages={inbox.messages}
            initialTotal={inbox.total}
            initialPage={1}
            signature={mailbox.signature}
            savedSignatures={signatures.map((s) => ({
              id: s.id,
              name: s.name,
              content: s.content,
              isDefault: s.isDefault,
            }))}
            initialFilter={tab === "importantes" ? "flagged" : "all"}
          />
        </Card>
      ) : null}

      {tab === "enviados" ? (
        <Card className="overflow-hidden p-0">
          <SentMessages
            mailboxId={mailbox.id}
            initialMessages={sent.messages}
            initialTotal={sent.total}
            emptyHint={
              sent.total === 0
                ? "No hay correos en tu carpeta Enviados. Los próximos envíos desde el CRM quedarán guardados aquí."
                : undefined
            }
          />
        </Card>
      ) : null}

      {tab === "borradores" ? (
        <Card className="overflow-hidden p-0">
          <DraftsList initialDrafts={drafts} initialScheduled={scheduled} />
        </Card>
      ) : null}

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Firmas guardadas
        </summary>
        <div className="px-5 py-4">
          <SignaturesManager
            initial={signatures.map((s) => ({
              id: s.id,
              name: s.name,
              content: s.content,
              isDefault: s.isDefault,
            }))}
          />
        </div>
      </details>

      <details className="rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Editar configuración de la casilla (incluye tu firma)
        </summary>
        <div className="px-5 pb-5">
          <MailboxConfigForm mailbox={mailbox} />
        </div>
      </details>

      <p className="text-xs text-gray-400">
        La bandeja se actualiza automáticamente cada minuto y al pulsar
        &ldquo;Actualizar&rdquo;. Los correos enviados a un lead lo marcan como
        CONTACTADO.
      </p>
    </div>
  );
}