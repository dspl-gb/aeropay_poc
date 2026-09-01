import { NextResponse } from "next/server";

import { AeroPayError, getTransaction, getUserForMerchantToken } from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/transactions/[id]
 *
 * Fetch a single transaction by its ID.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const token = await getUserForMerchantToken(session.userId);
    const result = await getTransaction(token, id);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/transactions/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
