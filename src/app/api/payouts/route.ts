import { NextResponse } from "next/server";

import {
  AeroPayError,
  createPayoutTransaction,
  getMerchantToken,
  dollarsToPennies,
} from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * POST /api/payouts
 *
 * Create a payout transaction: funds move from the merchant to the user's
 * linked bank account. Uses a merchant-scoped token (merchant-level op).
 *
 * Body: { userId?: string, amount: number (dollars), referenceId?: string,
 *         rtp?: boolean, bankAccountId?: number }
 * `userId` defaults to the signed-in user (the merchant pays this demo user).
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { userId, amount, referenceId, rtp, bankAccountId } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount (positive number) is required" }, { status: 400 });
    }

    const targetUserId = typeof userId === "string" && userId ? userId : session.userId;

    const merchantToken = await getMerchantToken();
    const result = await createPayoutTransaction(merchantToken, {
      userId: targetUserId,
      merchantId: Number(session.merchantId),
      amount: { amount: dollarsToPennies(amount), currency: "USD" },
      referenceId: referenceId ?? `APX-${Date.now()}`,
      ...(typeof rtp === "boolean" ? { rtp } : {}),
      ...(typeof bankAccountId === "number" ? { bankAccountId } : {}),
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/payouts POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
