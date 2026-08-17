import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { inboxPreview } from "@/actions/mail";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MailboxConfigForm } from "@/components/mailbox-config-form";
import { EmailInbox } from "@/components/email-inbox";
import { EmailCompose } from "@/components/email-compose";

export const dynamic = "force-dynamic";

export default async function CorreosPage() {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });

  let messages: Awaited<ReturnType<typeof inboxPreview>> = [];
  let inboxError: string | null = null;

  if (mailbox) {
    try {
      messages = await inboxPreview(mailbox.id, 100);
    } catch (e) {
      console.error("Error leyendo buzón:", e);
      inboxError =
        "No se pudo conectar a la casilla. Verifica que la dirección y la contraseña sean correctas.";
    }
  }

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
        <EmailCompose triggerLabel="+ Nuevo correo" />
      </div>

      {inboxError ? (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {inboxError}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <EmailInbox mailboxId={mailbox.id} initialMessages={messages} />
      </Card>

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