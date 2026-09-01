import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/aeropay
 *
 * Receives AeroPay webhook events (transaction_completed, transaction_declined, etc.).
 * @see https://dev.aero.inc/docs/webhooks-1
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const topic = typeof payload.topic === "string" ? payload.topic : "unknown";

    try {
      const admin = createAdminClient();
      await admin.from("webhook_events").insert({
        topic,
        payload,
      });
    } catch (dbErr) {
      // Still acknowledge the webhook if persistence fails (e.g. missing service role key).
      console.error("[/api/webhooks/aeropay] persistence failed", dbErr);
    }

    console.info("[/api/webhooks/aeropay]", topic, payload?.data?.id ?? "");

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[/api/webhooks/aeropay]", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
