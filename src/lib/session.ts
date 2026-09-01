/**
 * Lightweight session helper for Next.js Route Handlers.
 *
 * Stores AeroPay user context in an HTTP-only cookie after setup.
 * Supabase Auth handles application login separately.
 */

import { cookies } from "next/headers";

const COOKIE_NAME = "aeropay_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionData {
  userId: string;
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as SessionData;
    if (!data.userId) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Pending MFA after POST /v2/user — 15 minutes, matching AeroPay OTP TTL. */
const PENDING_COOKIE = "aeropay_pending";
const PENDING_MAX_AGE = 15 * 60;

export interface PendingAeroPayUser {
  supabaseUserId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  mfaType: string | null;
}

export async function setPendingAeroPayUser(data: PendingAeroPayUser): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  cookieStore.set(PENDING_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PENDING_MAX_AGE,
    path: "/",
  });
}

export async function getPendingAeroPayUser(): Promise<PendingAeroPayUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_COOKIE)?.value;
  if (!raw) return null;

  try {
    const data = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as PendingAeroPayUser;
    if (!data.userId || !data.supabaseUserId) return null;
    return data;
  } catch {
    return null;
  }
}

export async function clearPendingAeroPayUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_COOKIE);
}
