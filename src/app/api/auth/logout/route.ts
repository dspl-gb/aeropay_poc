import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { clearPendingAeroPayUser, clearSession } from "@/lib/session";

/**
 * POST /api/auth/logout
 *
 * Signs out of Supabase and clears the AeroPay session cookie.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearSession();
  await clearPendingAeroPayUser();
  return NextResponse.json({ success: true });
}
