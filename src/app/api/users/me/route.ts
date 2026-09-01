import { NextResponse } from "next/server";

import { AeroPayError, getUser, getUserForMerchantToken } from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/users/me
 *
 * Fetch the authenticated user's profile from AeroPay.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const token = await getUserForMerchantToken(session.userId);
    const { user } = await getUser(token);

    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/users/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
