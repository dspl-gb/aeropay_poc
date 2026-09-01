import { NextResponse } from "next/server";

import { AeroPayError } from "@/lib/aeropay-api";
import { requireSupabaseUser } from "@/lib/auth";
import { confirmAeroPayUser } from "@/lib/aeropay-setup";

/**
 * POST /api/aeropay/confirm
 *
 * Step 3: verify the OTP from POST /v2/confirmUser. Only after this succeeds
 * is the AeroPay userId stored. Sandbox accepts 000000.
 */
export async function POST(req: Request) {
  try {
    const supabaseUser = await requireSupabaseUser();
    const { code } = await req.json();

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }

    const result = await confirmAeroPayUser(supabaseUser.id, code);

    return NextResponse.json({
      user: result.aeropayUser,
      profile: result.profile,
      hasBankAccount: result.hasBankAccount,
      bankAccountCount: result.bankAccountCount,
    });
  } catch (err) {
    if (err instanceof AeroPayError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status === 200 ? 422 : err.status },
      );
    }
    if (err instanceof Error && err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[/api/aeropay/confirm]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
