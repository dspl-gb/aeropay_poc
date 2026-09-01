import { NextResponse } from "next/server";

import { AeroPayError, getBankAccounts, getUserForMerchantToken } from "@/lib/aeropay-api";
import { getAeroPayProfile, getStoredUserProfile, getSupabaseUser, merchantId } from "@/lib/auth";
import { getSession, setSession } from "@/lib/session";

/**
 * GET /api/auth/session
 *
 * Returns Supabase auth state and AeroPay linkage status for the app shell.
 */
export async function GET() {
  const supabaseUser = await getSupabaseUser();

  if (!supabaseUser) {
    return NextResponse.json({ authenticated: false });
  }

  const profile = await getAeroPayProfile(supabaseUser.id);
  const storedProfile = await getStoredUserProfile(supabaseUser.id);
  let aeropaySession = await getSession();

  // Rehydrate AeroPay cookie from DB when missing (new browser tab, etc.)
  if (profile && !aeropaySession) {
    await setSession({
      userId: profile.aeropayUserId,
      merchantId: merchantId(),
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
    });
    aeropaySession = await getSession();
  }

  if (!profile || !aeropaySession) {
    return NextResponse.json({
      authenticated: true,
      aeropayConnected: false,
      supabaseUser: {
        id: supabaseUser.id,
        email: supabaseUser.email,
      },
      storedProfile: storedProfile
        ? {
            firstName: storedProfile.firstName,
            lastName: storedProfile.lastName,
            email: storedProfile.email,
            phoneNumber: storedProfile.phoneNumber,
          }
        : null,
    });
  }

  let hasBankAccount = false;
  let bankAccountCount = 0;

  try {
    const token = await getUserForMerchantToken(profile.aeropayUserId);
    const { bankAccounts } = await getBankAccounts(token);
    hasBankAccount = bankAccounts.length > 0;
    bankAccountCount = bankAccounts.length;
  } catch (err) {
    if (!(err instanceof AeroPayError)) {
      console.error("[/api/auth/session] bank account check failed", err);
    }
  }

  return NextResponse.json({
    authenticated: true,
    aeropayConnected: true,
    hasBankAccount,
    bankAccountCount,
    supabaseUser: {
      id: supabaseUser.id,
      email: supabaseUser.email,
    },
    user: {
      id: profile.aeropayUserId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phoneNumber: profile.phoneNumber,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      initials: `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase(),
    },
  });
}
