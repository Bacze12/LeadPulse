import Link from "next/link";
import { requireUser } from "@/lib/requireUser";
import { prisma } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { EmailCompose } from "@/components/email-compose";

export const dynamic = "force-dynamic";

export default async function NewEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; subject?: string }>;
}) {
  const user = await requireUser();
  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: user.id },
  });
  const { to, subject } = await searchParams;

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
          Enviando desde {mailbox.email}
        </p>
      </div>
      <Card className="p-0">
        <div className="p-4">
          <EmailCompose
            defaultOpen
            defaultTo={to}
            defaultSubject={subject}
            triggerLabel="Nuevo correo"
          />
        </div>
      </Card>
    </div>
  );
}