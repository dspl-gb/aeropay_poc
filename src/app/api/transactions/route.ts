import { NextResponse } from "next/server";

import {
  AeroPayError,
  createTransaction,
  getUserForMerchantToken,
  searchUserTransactions,
  getMerchantToken,
  dollarsToPennies,
} from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/transactions?page=1&perPage=50
 *
 * Search transactions for the signed-in AeroPay user only.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? 1);
    const perPage = Number(searchParams.get("perPage") ?? 50);

    const merchantToken = await getMerchantToken();
    const result = await searchUserTransactions(merchantToken, session.userId, { page, perPage });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/transactions GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/transactions
 *
 * Create a standard transaction (funds move from the user's linked bank
 * account to the merchant). Uses a userForMerchant-scoped token.
 * Accepts `amount` in dollars; converts to pennies for the AeroPay v2 API.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { bankAccountId, amount, referenceId, description } = await req.json();

    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "amount (number) is required" }, { status: 400 });
    }

    const userToken = await getUserForMerchantToken(session.userId);
    const result = await createTransaction(userToken, {
      bankAccountId,
      merchantId: Number(session.merchantId),
      amount: { amount: dollarsToPennies(amount), currency: "USD" },
      referenceId: referenceId ?? `APX-${Date.now()}`,
      description,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/transactions POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
