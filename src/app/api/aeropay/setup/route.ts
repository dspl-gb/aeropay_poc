import { NextResponse } from "next/server";

import { AeroPayError } from "@/lib/aeropay-api";
import { requireSupabaseUser } from "@/lib/auth";
import { setupAeroPayUser } from "@/lib/aeropay-setup";

/**
 * POST /api/aeropay/setup
 *
 * Step 2 of the integration flow: create an AeroPay user (new or network).
 * POST /v2/user disconnects the user from this merchant until they complete
 * POST /confirmUser. The AeroPay userId is not saved until confirmation.
 */
export async function POST(req: Request) {
  try {
    const supabaseUser = await requireSupabaseUser();
    const body = await req.json();
    const useStoredProfile = body?.useStoredProfile === true;

    let setupInput:
      | { supabaseUserId: string; useStoredProfile: true }
      | {
          supabaseUserId: string;
          firstName: string;
          lastName: string;
          phoneNumber: string;
          email: string;
        };

    if (useStoredProfile) {
      setupInput = { supabaseUserId: supabaseUser.id, useStoredProfile: true };
    } else {
      const { firstName, lastName, phoneNumber, email } = body;

      if (!firstName || !lastName || !phoneNumber) {
        return NextResponse.json(
          { error: "firstName, lastName, and phoneNumber are required" },
          { status: 400 },
        );
      }

      setupInput = {
        supabaseUserId: supabaseUser.id,
        firstName,
        lastName,
        phoneNumber,
        email: email ?? supabaseUser.email ?? "",
      };
    }

    const result = await setupAeroPayUser(setupInput);

    if (result.status === "pending_mfa") {
      return NextResponse.json({
        needsMfa: true,
        mfaType: result.mfaType,
        phoneLast4: result.phoneLast4,
      });
    }

    return NextResponse.json({
      needsMfa: false,
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
    console.error("[/api/aeropay/setup]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
