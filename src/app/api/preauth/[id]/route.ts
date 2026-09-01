import { NextResponse } from "next/server";

import { AeroPayError, cancelPreauthTransaction, getUserForMerchantToken } from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * DELETE /api/preauth/[id]
 *
 * Cancel a preauthorized transaction before it is captured. Uses a
 * userForMerchant-scoped token since the preauth belongs to the user.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const userToken = await getUserForMerchantToken(session.userId);
    const result = await cancelPreauthTransaction(userToken, id);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/preauth/[id] DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
