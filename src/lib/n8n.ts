import "server-only";

export type N8nEvent = {
  event: string;
  entity: "lead" | "visit" | "quote" | "task" | "provider";
  data: Record<string, unknown>;
};

export async function emitN8n(event: N8nEvent): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return false;

  const secret = process.env.N8N_WEBHOOK_SECRET;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "x-webhook-secret": secret } : {}),
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error("n8n webhook respondió con estado", res.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error notificando a n8n:", error);
    return false;
  }
}