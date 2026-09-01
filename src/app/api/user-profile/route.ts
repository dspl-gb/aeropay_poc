import { NextResponse } from "next/server";

import { getStoredUserProfile, requireSupabaseUser } from "@/lib/auth";
import { getUsPhoneValidationError, normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/user-profile
 *
 * Returns profile fields saved at signup (may exist before AeroPay confirm).
 */
export async function GET() {
  try {
    const supabaseUser = await requireSupabaseUser();
    const profile = await getStoredUserProfile(supabaseUser.id);

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[/api/user-profile GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/user-profile
 *
 * Saves AeroPay-required fields at account creation time.
 */
export async function POST(req: Request) {
  try {
    const supabaseUser = await requireSupabaseUser();
    const { firstName, lastName, phoneNumber, email } = await req.json();

    if (!firstName || !lastName || !phoneNumber) {
      return NextResponse.json(
        { error: "firstName, lastName, and phoneNumber are required" },
        { status: 400 },
      );
    }

    const phoneError = getUsPhoneValidationError(phoneNumber);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const admin = createAdminClient();
    const normalizedPhone = normalizeUsPhone(phoneNumber);
    const resolvedEmail = email ?? supabaseUser.email ?? "";

    const { data: existing } = await admin
      .from("aeropay_profiles")
      .select("aeropay_user_id")
      .eq("user_id", supabaseUser.id)
      .maybeSingle();

    if (existing?.aeropay_user_id) {
      return NextResponse.json(
        { error: "AeroPay profile is already verified and cannot be overwritten" },
        { status: 409 },
      );
    }

    const { error } = await admin.from("aeropay_profiles").upsert(
      {
        user_id: supabaseUser.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: normalizedPhone,
        email: resolvedEmail,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(`Failed to save profile: ${error.message}`);
    }

    return NextResponse.json({
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: normalizedPhone,
        email: resolvedEmail,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("[/api/user-profile POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
