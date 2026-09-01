import { NextResponse } from "next/server";

import {
  AeroPayError,
  linkAccountFromAggregator,
  getUserForMerchantToken,
} from "@/lib/aeropay-api";
import { getSession } from "@/lib/session";

/**
 * POST /api/bank-accounts/link
 *
 * Complete the bank linking flow by associating the aggregator
 * connectionId with the user's AeroPay account.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { connectionId, aggregator } = await req.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 },
      );
    }

    const token = await getUserForMerchantToken(session.userId);
    const result = await linkAccountFromAggregator(token, {
      connectionId,
      aggregator: aggregator ?? "aerosync",
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    console.error("[/api/bank-accounts/link]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
