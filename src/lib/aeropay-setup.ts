/**
 * AeroPay new-user and network-user provisioning.
 *
 * Official flow:
 * 1. POST /v2/user (merchant token) — MFA is sent for both new and network users
 * 2. POST /v2/confirmUser — must follow POST /user whenever MFA was sent
 * 3. Persist aeropay_user_id only after confirmUser succeeds
 * 4. GET /v2/user + GET /v2/bankAccounts with a userForMerchant token
 *
 * After a successful confirmUser, do not call POST /user again for that user.
 */

import {
  AeroPayError,
  confirmUser,
  createUser,
  extractAeroUserId,
  getBankAccounts,
  getMerchantToken,
  getUser,
  getUserForMerchantToken,
  type AeroUser,
} from "@/lib/aeropay-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { merchantId, type AeroPayProfile } from "@/lib/auth";
import {
  clearPendingAeroPayUser,
  setPendingAeroPayUser,
  getPendingAeroPayUser,
  setSession,
} from "@/lib/session";
import { getUsPhoneValidationError, normalizeUsPhone, usPhoneLast4 } from "@/lib/phone";

export type SetupAeroPayInput = {
  supabaseUserId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
};

export type PendingMfaResult = {
  status: "pending_mfa";
  mfaType: "sms" | "email";
  phoneLast4: string;
};

export type ConnectedResult = {
  status: "connected";
  profile: AeroPayProfile;
  aeropayUser: AeroUser;
  hasBankAccount: boolean;
  bankAccountCount: number;
};

export type SetupAeroPayResult = PendingMfaResult | ConnectedResult;

async function loadExistingProfile(supabaseUserId: string): Promise<AeroPayProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("aeropay_profiles")
    .select("aeropay_user_id, first_name, last_name, email, phone_number")
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (error || !data?.aeropay_user_id) return null;

  return {
    supabaseUserId,
    aeropayUserId: data.aeropay_user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email ?? "",
    phoneNumber: data.phone_number,
  };
}

export async function loadStoredProfileInput(
  supabaseUserId: string,
): Promise<SetupAeroPayInput | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("aeropay_profiles")
    .select("first_name, last_name, email, phone_number")
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    supabaseUserId,
    firstName: data.first_name,
    lastName: data.last_name,
    phoneNumber: data.phone_number,
    email: data.email ?? "",
  };
}

async function saveProfile(input: SetupAeroPayInput, aeropayUser: AeroUser): Promise<AeroPayProfile> {
  const admin = createAdminClient();
  const { error } = await admin.from("aeropay_profiles").upsert(
    {
      user_id: input.supabaseUserId,
      aeropay_user_id: aeropayUser.id,
      first_name: input.firstName,
      last_name: input.lastName,
      phone_number: normalizeUsPhone(input.phoneNumber),
      email: input.email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to save AeroPay profile: ${error.message}`);
  }

  return {
    supabaseUserId: input.supabaseUserId,
    aeropayUserId: aeropayUser.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phoneNumber: normalizeUsPhone(input.phoneNumber),
  };
}

async function completeVerifiedUser(
  input: SetupAeroPayInput,
  aeropayUser: AeroUser,
): Promise<ConnectedResult> {
  const profile = await saveProfile(input, aeropayUser);

  await setSession({
    userId: aeropayUser.id,
    merchantId: merchantId(),
    firstName: aeropayUser.firstName || input.firstName,
    lastName: aeropayUser.lastName || input.lastName,
    email: aeropayUser.email || input.email,
    phoneNumber: aeropayUser.phoneNumber || input.phoneNumber,
  });

  await clearPendingAeroPayUser();

  const userToken = await getUserForMerchantToken(aeropayUser.id);
  const [{ user: freshUser }, { bankAccounts }] = await Promise.all([
    getUser(userToken).catch(() => ({ user: aeropayUser })),
    getBankAccounts(userToken).catch(() => ({ bankAccounts: [] })),
  ]);

  const resolvedUser = freshUser.id ? freshUser : aeropayUser;

  return {
    status: "connected",
    profile,
    aeropayUser: resolvedUser,
    hasBankAccount: bankAccounts.length > 0,
    bankAccountCount: bankAccounts.length,
  };
}

async function completeFromExistingProfile(profile: AeroPayProfile): Promise<ConnectedResult> {
  await setSession({
    userId: profile.aeropayUserId,
    merchantId: merchantId(),
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phoneNumber: profile.phoneNumber,
  });

  const userToken = await getUserForMerchantToken(profile.aeropayUserId);
  const [{ user }, { bankAccounts }] = await Promise.all([
    getUser(userToken).catch(() => ({
      user: {
        id: profile.aeropayUserId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        type: "consumer",
        email: profile.email,
        phoneNumber: profile.phoneNumber,
        createdDate: "",
      } satisfies AeroUser,
    })),
    getBankAccounts(userToken).catch(() => ({ bankAccounts: [] })),
  ]);

  return {
    status: "connected",
    profile,
    aeropayUser: user,
    hasBankAccount: bankAccounts.length > 0,
    bankAccountCount: bankAccounts.length,
  };
}

async function stashPendingMfa(
  input: SetupAeroPayInput,
  aeropayUser: AeroUser,
  mfaType: "sms" | "email",
): Promise<PendingMfaResult> {
  await setPendingAeroPayUser({
    supabaseUserId: input.supabaseUserId,
    userId: aeropayUser.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    mfaType,
  });

  return {
    status: "pending_mfa",
    mfaType,
    phoneLast4: usPhoneLast4(input.phoneNumber),
  };
}

/**
 * Step 2: create (or reconnect) an AeroPay user for the signed-in Supabase user.
 *
 * Does not persist aeropay_user_id until confirmUser succeeds.
 * Returning users who already completed confirmUser skip POST /user.
 */
export async function setupAeroPayUser(
  input: SetupAeroPayInput | { supabaseUserId: string; useStoredProfile: true },
): Promise<SetupAeroPayResult> {
  const resolvedInput =
    "useStoredProfile" in input
      ? await loadStoredProfileInput(input.supabaseUserId)
      : input;

  if (!resolvedInput) {
    throw new Error("Complete your profile at sign-up before connecting AeroPay.");
  }

  if (!resolvedInput.firstName || !resolvedInput.lastName || !resolvedInput.phoneNumber) {
    throw new Error("firstName, lastName, and phoneNumber are required");
  }

  const phoneError = getUsPhoneValidationError(resolvedInput.phoneNumber);
  if (phoneError) {
    throw new Error(phoneError);
  }

  const existing = await loadExistingProfile(resolvedInput.supabaseUserId);
  if (existing) {
    return completeFromExistingProfile(existing);
  }

  const phoneNumber = normalizeUsPhone(resolvedInput.phoneNumber);
  const normalizedInput = { ...resolvedInput, phoneNumber };
  const merchantToken = await getMerchantToken();

  let aeropayUser: AeroUser;
  let mfaType: string | null;

  try {
    const result = await createUser(merchantToken, {
      firstName: resolvedInput.firstName,
      lastName: resolvedInput.lastName,
      phoneNumber,
      email: resolvedInput.email,
    });
    aeropayUser = result.user;
    mfaType = result.mfaType;
  } catch (err) {
    if (err instanceof AeroPayError) {
      const existingId = extractAeroUserId(err.body);
      if (existingId) {
        aeropayUser = {
          id: existingId,
          firstName: resolvedInput.firstName,
          lastName: resolvedInput.lastName,
          type: "consumer",
          email: resolvedInput.email,
          phoneNumber,
          createdDate: "",
        };
        mfaType = "sms";
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  if (!aeropayUser.id) {
    throw new Error("AeroPay did not return a user id");
  }

  // POST /confirmUser must always follow POST /user. Each POST /user
  // disconnects the user from this merchant until MFA completes.
  const challengeType = mfaType === "email" ? "email" : "sms";
  return stashPendingMfa(normalizedInput, aeropayUser, challengeType);
}

/**
 * Step 3: verify the OTP from POST /confirmUser, then persist the user.
 */
export async function confirmAeroPayUser(
  supabaseUserId: string,
  code: string,
): Promise<ConnectedResult> {
  const pending = await getPendingAeroPayUser();
  if (!pending || pending.supabaseUserId !== supabaseUserId) {
    throw new Error("Verification expired. Please create your AeroPay user again.");
  }

  const trimmed = code.trim();
  if (!trimmed) {
    throw new Error("A verification code is required");
  }

  const merchantToken = await getMerchantToken();
  const { user } = await confirmUser(merchantToken, {
    userId: pending.userId,
    code: trimmed,
    merchantId: merchantId(),
  });

  const aeropayUser: AeroUser = {
    ...user,
    id: user.id || pending.userId,
    firstName: user.firstName || pending.firstName,
    lastName: user.lastName || pending.lastName,
    email: user.email || pending.email,
    phoneNumber: user.phoneNumber || pending.phoneNumber,
  };

  return completeVerifiedUser(
    {
      supabaseUserId,
      firstName: pending.firstName,
      lastName: pending.lastName,
      phoneNumber: pending.phoneNumber,
      email: pending.email,
    },
    aeropayUser,
  );
}
