import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { EmailCompose } from "@/components/email-compose";

export const dynamic = "force-dynamic";

export default async function NewEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; subject?: string; draft?: string }>;
}) {
  const user = await requireUser();
  const [mailbox, signatures] = await Promise.all([
    prisma.mailbox.findUnique({
      where: { userId: user.id },
    }),
    prisma.signature.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
  ]);
  const { to, subject, draft: draftId } = await searchParams;

  const draft = draftId
    ? await prisma.emailDraft.findFirst({
        where: { id: draftId, userId: user.id },
      })
    : null;

  if (!mailbox) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Redactar correo</h1>
        <Card>
          <CardHeader title="No tienes una casilla configurada" />
          <p className="px-5 py-4 text-sm text-gray-600">
            Para enviar correos primero conecta tu cuenta de Titan en{" "}
            <Link href="/correos" className="font-semibold text-indigo-600 hover:underline">
              Correos
            </Link>
            .
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Redactar correo</h1>
        <p className="mt-1 text-sm text-gray-500">
          {draft ? "Editando borrador · " : ""}Enviando desde {mailbox.email}
        </p>
      </div>
      <Card className="p-0">
        <div className="p-4">
          <EmailCompose
            defaultOpen
            defaultTo={draft?.to ?? to}
            defaultSubject={draft?.subject ?? subject}
            signature={mailbox.signature ?? undefined}
            savedSignatures={signatures.map((s) => ({
              id: s.id,
              name: s.name,
              content: s.content,
              isDefault: s.isDefault,
            }))}
            triggerLabel="Nuevo correo"
            draft={
              draft
                ? {
                    id: draft.id,
                    to: draft.to,
                    cc: draft.cc,
                    bcc: draft.bcc,
                    subject: draft.subject,
                    message: draft.message,
                    signature: draft.signature,
                  }
                : null
            }
          />
        </div>
      </Card>
    </div>
  );
}