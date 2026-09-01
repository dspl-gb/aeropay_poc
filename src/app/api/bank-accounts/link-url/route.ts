import { NextResponse } from "next/server";

import {
  AeroPayError,
  getAggregatorCredentials,
  getUserForMerchantToken,
} from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * GET /api/bank-accounts/link-url?redirectUri=...
 *
 * Returns the Aerosync widget URL for bank linking.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const redirectUri =
      searchParams.get("redirectUri") ??
      `${req.url.split("/api/")[0]}/bank-link/callback`;

    const token = await getUserForMerchantToken(session.userId);
    const result = await getAggregatorCredentials(token, redirectUri);

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/bank-accounts/link-url]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
