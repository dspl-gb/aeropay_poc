import { NextResponse } from "next/server";

import { AeroPayError, capturePreauthTransaction, getMerchantToken } from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * POST /api/preauth/[id]/capture
 *
 * Execute (capture) a previously authorized payment — funds move from the
 * customer's linked bank to the merchant. Merchant-scoped token per the
 * Aeropay capture API. @see https://dev.aero.inc/docs/preauth-transaction-step-6-capture-the-preauth-transaction
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const merchantToken = await getMerchantToken();
    const result = await capturePreauthTransaction(merchantToken, id);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/preauth/[id]/capture POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
