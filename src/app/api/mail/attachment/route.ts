import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { downloadAttachment, resolveSentPath } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const uid = Number(sp.get("uid"));
  const partId = sp.get("partId");
  if (!Number.isInteger(uid) || uid < 1 || !partId) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const mailbox = await prisma.mailbox.findUnique({
    where: { userId: session.user.id },
  });
  if (!mailbox) {
    return NextResponse.json({ error: "Casilla no configurada" }, { status: 404 });
  }

  try {
    let folder = "INBOX";
    if (sp.get("folder") === "sent") {
      const sentPath = await resolveSentPath({
        id: mailbox.id,
        email: mailbox.email,
        password: mailbox.password,
        imapHost: mailbox.imapHost,
        imapPort: mailbox.imapPort,
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
      });
      if (!sentPath) {
        return NextResponse.json(
          { error: "Adjunto no encontrado" },
          { status: 404 }
        );
      }
      folder = sentPath;
    }
    const file = await downloadAttachment(
      {
        id: mailbox.id,
        email: mailbox.email,
        password: mailbox.password,
        imapHost: mailbox.imapHost,
        imapPort: mailbox.imapPort,
        smtpHost: mailbox.smtpHost,
        smtpPort: mailbox.smtpPort,
      },
      uid,
      partId,
      folder
    );
    if (!file) {
      return NextResponse.json({ error: "Adjunto no encontrado" }, { status: 404 });
    }
    const safeName = file.filename.replace(/[\\/:*?"<>|]/g, "_");
    return new Response(new Uint8Array(file.content), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Content-Length": String(file.content.byteLength),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo descargar el adjunto" },
      { status: 500 }
    );
  }
}