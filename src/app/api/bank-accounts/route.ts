import { NextResponse } from "next/server";

import { AeroPayError, getBankAccounts, getUserForMerchantToken } from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/bank-accounts
 *
 * List all bank accounts linked to the authenticated user.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = await getUserForMerchantToken(session.userId);
    const result = await getBankAccounts(token);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/bank-accounts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
