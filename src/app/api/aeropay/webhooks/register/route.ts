import { NextResponse } from "next/server";

import { AeroPayError, createWebhook, getMerchantToken } from "@/lib/aeropay-api";
import { requireSupabaseUser } from "@/lib/auth";

const WEBHOOK_TOPICS = [
  "transaction_completed",
  "transaction_declined",
  "transaction_voided",
  "transaction_refunded",
] as const;

/**
 * POST /api/aeropay/webhooks/register
 *
 * Registers sandbox webhook URLs pointing at this app (requires public NEXT_PUBLIC_APP_URL).
 * Call once after deploying or starting an ngrok tunnel.
 */
export async function POST() {
  try {
    await requireSupabaseUser();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is required to register webhooks" },
        { status: 400 },
      );
    }

    const callbackUrl = `${baseUrl.replace(/\/+$/, "")}/api/webhooks/aeropay`;
    const merchantToken = await getMerchantToken();

    const results = [];
    for (const topic of WEBHOOK_TOPICS) {
      const result = await createWebhook(merchantToken, { topic, url: callbackUrl });
      results.push({ topic, result });
    }

    return NextResponse.json({ callbackUrl, topics: results });
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/aeropay/webhooks/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
