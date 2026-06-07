import { NextRequest, NextResponse } from "next/server";
import {
  extractGeminiOperationName,
  loadGeminiWebhookSecrets,
  updateGeminiOperationFromWebhook,
  verifyStandardWebhook,
} from "@/lib/gemini-ops";
import { getServerSupabase } from "@/lib/server-supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const webhookId = req.headers.get("webhook-id");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  const headers = Object.fromEntries(req.headers.entries());
  const secrets = await loadGeminiWebhookSecrets();
  const allowUnverified = process.env.NODE_ENV !== "production" && process.env.GEMINI_WEBHOOK_ALLOW_UNVERIFIED === "true";

  const verified = secrets.some((secret) => verifyStandardWebhook({ body: rawBody, headers, secret }));
  if (secrets.length > 0) {
    if (!verified) {
      return NextResponse.json({ error: "invalid webhook signature" }, { status: 401 });
    }
  } else if (!allowUnverified) {
    return NextResponse.json({ error: "Gemini webhook signing secret is not configured" }, { status: 501 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const eventType = typeof payload.type === "string"
    ? payload.type
    : typeof payload.event_type === "string"
      ? payload.event_type
      : "gemini.webhook.received";
  const operationName = extractGeminiOperationName(payload);
  const supabase = getServerSupabase();

  const { error } = await supabase.from("gemini_webhook_events").upsert(
    {
      webhook_id: webhookId ?? crypto.randomUUID(),
      event_type: eventType,
      operation_name: operationName,
      payload,
      headers: {
        "webhook-id": webhookId,
        "webhook-timestamp": webhookTimestamp,
        verified,
      },
    },
    { onConflict: "webhook_id" },
  );

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  await updateGeminiOperationFromWebhook({ operationName, eventType, payload });

  return NextResponse.json({ ok: true, eventType, operationName });
}
