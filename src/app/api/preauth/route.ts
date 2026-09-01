import { NextResponse } from "next/server";

import {
  AeroPayError,
  aeroUserIdsMatch,
  createPreauthTransaction,
  getMerchantToken,
  getPreauthTransactions,
  getUserForMerchantToken,
  dollarsToPennies,
} from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/preauth?level=live
 *
 * List preauthorized transactions for the signed-in user. Uses a
 * merchant-scoped token, then filters to the session user's authorizations.
 * AeroPay is the system of record — nothing is stored on our side.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") ?? undefined;

    const merchantToken = await getMerchantToken();
    const result = await getPreauthTransactions(merchantToken, { level, perPage: 50 });

    // The merchant-scoped listing covers all merchant users; keep only the
    // authorizations that belong to the signed-in user.
    const transactions = result.transactions.filter((tx) =>
      aeroUserIdsMatch(String(tx.userId), session.userId),
    );

    return NextResponse.json({ transactions });
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/preauth GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/preauth
 *
 * Create a preauthorized transaction (customer authorizes a future payment).
 * Uses a userForMerchant-scoped token — acting on behalf of the user.
 * The authorization is stored on the Aeropay side until captured or canceled.
 *
 * Body: { amount: number (dollars), referenceId?: string, description?: string, bankAccountId?: number }
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { amount, referenceId, description, bankAccountId } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount (positive number) is required" }, { status: 400 });
    }

    const userToken = await getUserForMerchantToken(session.userId);
    const result = await createPreauthTransaction(userToken, {
      ...(typeof bankAccountId === "number" ? { bankAccountId } : {}),
      merchantId: Number(session.merchantId),
      amount: { amount: dollarsToPennies(amount), currency: "USD" },
      referenceId: referenceId ?? `APX-${Date.now()}`,
      ...(typeof description === "string" && description ? { description } : {}),
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/preauth POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
