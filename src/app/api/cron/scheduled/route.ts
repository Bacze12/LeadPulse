import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { processDueScheduledEmails } from "@/actions/mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }
  try {
    const sent = await processDueScheduledEmails();
    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    console.error("Error procesando correos programados:", e);
    return NextResponse.json(
      { ok: false, error: "Error procesando correos programados" },
      { status: 500 }
    );
  }
}
