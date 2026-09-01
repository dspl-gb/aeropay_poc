import { createClient } from "@/lib/supabase/server";

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export type StoredUserProfile = {
  supabaseUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  aeropayUserId?: string | null;
};

export type AeroPayProfile = StoredUserProfile & {
  aeropayUserId: string;
};

export async function getSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}

export async function getStoredUserProfile(
  supabaseUserId: string,
): Promise<StoredUserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("aeropay_profiles")
    .select("aeropay_user_id, first_name, last_name, email, phone_number")
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    supabaseUserId,
    aeropayUserId: data.aeropay_user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email ?? "",
    phoneNumber: data.phone_number,
  };
}

export async function getAeroPayProfile(supabaseUserId: string): Promise<AeroPayProfile | null> {
  const stored = await getStoredUserProfile(supabaseUserId);
  if (!stored?.aeropayUserId) return null;

  return {
    ...stored,
    aeropayUserId: stored.aeropayUserId,
  };
}

export async function requireSupabaseUser() {
  const user = await getSupabaseUser();
  if (!user) throw new AuthError("Not authenticated");
  return user;
}

export async function requireAeroPayProfile() {
  const supabaseUser = await requireSupabaseUser();
  const profile = await getAeroPayProfile(supabaseUser.id);
  if (!profile) {
    throw new AuthError("Connect your AeroPay account to continue", "AEROPAY_NOT_CONNECTED");
  }
  return { supabaseUser, profile };
}

export function merchantId(): string {
  const id = process.env.AEROPAY_MERCHANT_ID;
  if (!id) throw new Error("AEROPAY_MERCHANT_ID is not set");
  return id;
}
