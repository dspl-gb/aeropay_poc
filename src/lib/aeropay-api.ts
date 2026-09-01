/**
 * Server-side AeroPay API client.
 *
 * This module MUST only be imported inside Next.js Route Handlers or Server
 * Components — it reads secrets from process.env and makes outbound HTTP calls.
 *
 * @see https://dev.aero.inc/  – full API reference
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TokenScope = "merchant" | "userForMerchant";

export interface AeroTokenResponse {
  TTL: number;
  token: string;
}

export interface AeroUser {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  email: string;
  phoneNumber: string;
  createdDate: string;
  userStatus?: string;
}

export interface BankAccount {
  id: number;
  bankAccountId?: number;
  accountType: string;
  accountNumber: string;
  accountLast4?: string;
  routingNumber: string;
  bankName: string;
  name?: string;
  isSelected: boolean;
  status: string;
  createdDate?: string;
}

export interface AeroTransaction {
  id: string;
  amount: { amount: number; currency: string };
  status: string;
  paymentType: string;
  userId: string;
  referenceId?: string;
  merchantId: number;
  title?: string;
  createdDate?: string;
  isRtp: boolean;
  returnCode?: string;
  [key: string]: unknown;
}

export interface AeroPreauthTransaction {
  id: string;
  amount: { amount: number; currency: string };
  status: string;
  userId: string;
  referenceId?: string;
  description?: string;
  createdDate?: string;
  expiryDate?: string;
  userName?: string;
  userEmail?: string;
  merchantId?: number;
  [key: string]: unknown;
}

export interface TransactionSearchResult {
  transactions: AeroTransaction[];
  paging: {
    total: number;
    page: number;
    perPage: number;
  };
}

export interface AggregatorCredentials {
  token: string;
  fastlinkURL?: string;
  /** Legacy alias some responses use instead of fastlinkURL */
  url?: string;
  username?: string;
  aggregator?: string;
  [key: string]: unknown;
}

interface AeroErrorBody {
  success?: false;
  code?: string;
  error?: string | Record<string, unknown>;
  message?: string | Record<string, unknown>;
  user?: { id?: string };
  userId?: string | number;
  [key: string]: unknown;
}

function stringifyAeroError(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseAeroError(body: AeroErrorBody, fallback: string): { code: string; message: string } {
  const nested = body.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    const record = nested as { code?: string; message?: unknown };
    return {
      code: record.code ?? body.code ?? "UNKNOWN",
      message: stringifyAeroError(record.message, fallback),
    };
  }

  return {
    code: body.code ?? "UNKNOWN",
    message: stringifyAeroError(body.error ?? body.message, fallback),
  };
}

export function extractAeroUserId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.userId === "string" && record.userId) return record.userId;
  if (typeof record.userId === "number") return String(record.userId);
  const user = record.user;
  if (user && typeof user === "object" && "id" in user) {
    const id = (user as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
    if (typeof id === "number") return String(id);
  }
  if (typeof record.id === "string" && record.id) return record.id;
  return null;
}

function normalizeAeroUser(raw: Record<string, unknown> | undefined): AeroUser {
  const phone = raw?.phoneNumber ?? raw?.phone ?? "";
  return {
    id: String(raw?.id ?? ""),
    firstName: String(raw?.firstName ?? ""),
    lastName: String(raw?.lastName ?? ""),
    type: String(raw?.type ?? "consumer"),
    email: String(raw?.email ?? ""),
    phoneNumber: String(phone),
    createdDate: String(raw?.createdDate ?? ""),
    userStatus: raw?.userStatus ? String(raw.userStatus) : undefined,
  };
}

function normalizeAeroUserId(userId: string): string {
  const value = String(userId).trim();
  const colonIdx = value.lastIndexOf(":");
  return colonIdx >= 0 ? value.slice(colonIdx + 1) : value;
}

/** Compare AeroPay user ids that may include a regional prefix (e.g. us-east-1:uuid). */
export function aeroUserIdsMatch(a: string, b: string): boolean {
  if (String(a) === String(b)) return true;
  return normalizeAeroUserId(a) === normalizeAeroUserId(b);
}

function normalizeTransactionSearchResult(raw: Record<string, unknown>): TransactionSearchResult {
  const pagingRaw = raw.paging as Record<string, unknown> | undefined;

  return {
    transactions: (raw.transactions ?? []) as AeroTransaction[],
    paging: {
      total: Number(pagingRaw?.totalItems ?? pagingRaw?.total ?? 0),
      page: Number(pagingRaw?.currentPage ?? pagingRaw?.page ?? 1),
      perPage: Number(pagingRaw?.itemsPerPage ?? pagingRaw?.perPage ?? 50),
    },
  };
}

function normalizeBankAccount(raw: Record<string, unknown>): BankAccount {
  const bankAccountId = Number(raw.bankAccountId ?? raw.id ?? 0);
  const last4 = String(raw.accountLast4 ?? "");
  return {
    id: bankAccountId,
    bankAccountId,
    accountType: String(raw.accountType ?? ""),
    accountNumber: last4 || String(raw.accountNumber ?? ""),
    accountLast4: last4 || undefined,
    routingNumber: String(raw.routingNumber ?? ""),
    bankName: String(raw.bankName ?? ""),
    name: raw.name ? String(raw.name) : undefined,
    isSelected: Boolean(raw.isSelected),
    status: String(raw.status ?? ""),
    createdDate: raw.createdDate ? String(raw.createdDate) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function baseUrl(): string {
  const url = process.env.AEROPAY_BASE_URL ?? "https://api.sandbox-pay.aero.inc/v2";
  return url.replace(/\/+$/, "");
}

function merchantId(): string {
  const id = process.env.AEROPAY_MERCHANT_ID;
  if (!id) throw new Error("AEROPAY_MERCHANT_ID is not set");
  return id;
}

function apiKey(): string {
  const key = process.env.AEROPAY_API_KEY;
  if (!key) throw new Error("AEROPAY_API_KEY is not set");
  return key;
}

function apiSecret(): string {
  const secret = process.env.AEROPAY_API_SECRET;
  if (!secret) throw new Error("AEROPAY_API_SECRET is not set");
  return secret;
}

export { dollarsToPennies, penniesToDollars } from "./aeropay-amount";

// ---------------------------------------------------------------------------
// Token cache
// ---------------------------------------------------------------------------

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

const tokenCache = new Map<string, CachedToken>();

function cacheKey(scope: TokenScope, userId?: string): string {
  return `${scope}:${userId ?? "merchant"}`;
}

function getCachedToken(scope: TokenScope, userId?: string): string | null {
  const entry = tokenCache.get(cacheKey(scope, userId));
  if (!entry) return null;
  // Refresh 60 s before expiry
  if (Date.now() >= entry.expiresAt - 60_000) {
    tokenCache.delete(cacheKey(scope, userId));
    return null;
  }
  return entry.token;
}

function setCachedToken(scope: TokenScope, userId?: string, token?: string, ttl?: number) {
  if (!token || !ttl) return;
  tokenCache.set(cacheKey(scope, userId), {
    token,
    expiresAt: Date.now() + ttl * 1000,
  });
}

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

class AeroPayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: unknown = null,
  ) {
    super(message);
    this.name = "AeroPayError";
  }
}

async function aeroRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "application/json",
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...init, headers });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = body as AeroErrorBody;
    const parsed = parseAeroError(err, `AeroPay request failed (${res.status})`);
    throw new AeroPayError(res.status, parsed.code, parsed.message, body);
  }

  // AeroPay sometimes returns { success: false } with 200 status
  const errBody = body as AeroErrorBody;
  if (errBody.success === false) {
    const parsed = parseAeroError(errBody, "AeroPay returned success: false");
    throw new AeroPayError(200, parsed.code, parsed.message, body);
  }

  // Business logic errors can also arrive as { error: { code, message } } with HTTP 200
  if (errBody.error && typeof errBody.error === "object" && "code" in errBody.error) {
    const parsed = parseAeroError(errBody, "AeroPay request failed");
    throw new AeroPayError(200, parsed.code, parsed.message, body);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export async function getMerchantToken(): Promise<string> {
  const cached = getCachedToken("merchant");
  if (cached) return cached;

  const data = await aeroRequest<AeroTokenResponse>("/token", {
    method: "POST",
    body: JSON.stringify({
      scope: "merchant",
      apiKey: apiKey(),
      apiSecret: apiSecret(),
      id: Number(merchantId()),
    }),
  });

  setCachedToken("merchant", undefined, data.token, data.TTL);
  return data.token;
}

export async function getUserForMerchantToken(userId: string): Promise<string> {
  const cached = getCachedToken("userForMerchant", userId);
  if (cached) return cached;

  const data = await aeroRequest<AeroTokenResponse>("/token", {
    method: "POST",
    body: JSON.stringify({
      scope: "userForMerchant",
      apiKey: apiKey(),
      apiSecret: apiSecret(),
      id: Number(merchantId()),
      userId,
    }),
  });

  setCachedToken("userForMerchant", userId, data.token, data.TTL);
  return data.token;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}

export interface CreateUserResult {
  user: AeroUser;
  mfaType: string | null;
}

export async function createUser(token: string, input: CreateUserInput): Promise<CreateUserResult> {
  const raw = await aeroRequest<{
    user?: Record<string, unknown>;
    mfaType?: string | null;
  }>("/user", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });

  return {
    user: normalizeAeroUser(raw.user),
    mfaType: raw.mfaType ?? null,
  };
}

export interface ConfirmUserInput {
  userId: string;
  code: string;
  merchantId: string | number;
}

export async function confirmUser(
  token: string,
  input: ConfirmUserInput,
): Promise<{ user: AeroUser }> {
  const raw = await aeroRequest<{ user?: Record<string, unknown> }>("/confirmUser", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      userId: input.userId,
      code: String(input.code),
      merchantId: Number(input.merchantId),
    }),
  });

  return { user: normalizeAeroUser(raw.user) };
}

export async function getUser(token: string): Promise<{ user: AeroUser }> {
  const raw = await aeroRequest<{ user?: Record<string, unknown> }>("/user", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
  return { user: normalizeAeroUser(raw.user) };
}

// ---------------------------------------------------------------------------
// Bank accounts
// ---------------------------------------------------------------------------

export async function getBankAccounts(token: string): Promise<{ bankAccounts: BankAccount[] }> {
  const raw = await aeroRequest<{ bankAccounts?: Record<string, unknown>[] }>("/bankAccounts", {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });

  return {
    bankAccounts: (raw.bankAccounts ?? []).map(normalizeBankAccount),
  };
}

export async function getAggregatorCredentials(
  token: string,
  redirectUri: string,
): Promise<AggregatorCredentials> {
  const params = new URLSearchParams({
    aggregator: "aerosync",
    redirectUri,
  });
  return aeroRequest<AggregatorCredentials>(`/aggregatorCredentials?${params}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

export interface LinkAccountInput {
  connectionId: string;
  aggregator: string;
}

export async function linkAccountFromAggregator(
  token: string,
  input: LinkAccountInput,
): Promise<{ bankAccountId: number; [key: string]: unknown }> {
  return aeroRequest<{ bankAccountId: number; [key: string]: unknown }>(
    "/linkAccountFromAggregator",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({
        connectionId: input.connectionId,
        aggregator: input.aggregator,
      }),
    },
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface CreateTransactionInput {
  bankAccountId?: number;
  merchantId: number;
  amount: { amount: number; currency: string };
  referenceId?: string;
  description?: string;
}

export interface CreateTransactionResult {
  transaction: AeroTransaction;
  [key: string]: unknown;
}

export async function createTransaction(
  token: string,
  input: CreateTransactionInput,
): Promise<CreateTransactionResult> {
  const idempotencyKey = crypto.randomUUID();
  return aeroRequest<CreateTransactionResult>("/transaction", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}

export interface TransactionSearchParams {
  page?: number | string;
  perPage?: number | string;
  paymentType?: string;
  sortBy?: string;
  orderBy?: string;
  searchType?: "transactionId" | "uuid" | "userId" | "name" | "phone" | "email" | "locationId" | "merchantId" | "default";
  /** Required when searchType is userId, transactionId, etc. */
  uuid?: string;
  filters?: {
    paymentType?: string;
    referenceId?: string;
  };
  [key: string]: unknown;
}

export async function searchTransactions(
  token: string,
  params: TransactionSearchParams = {},
): Promise<TransactionSearchResult> {
  const raw = await aeroRequest<Record<string, unknown>>("/transactionSearch", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({
      page: 1,
      perPage: 50,
      ...params,
    }),
  });

  return normalizeTransactionSearchResult(raw);
}

/** Search transactions for a single AeroPay user (merchant-scoped token). */
export async function searchUserTransactions(
  token: string,
  userId: string,
  params: Omit<TransactionSearchParams, "searchType" | "uuid"> = {},
): Promise<TransactionSearchResult> {
  const result = await searchTransactions(token, params);
  const transactions = result.transactions.filter((tx) => aeroUserIdsMatch(tx.userId, userId));

  return {
    transactions,
    paging: {
      total: transactions.length,
      page: result.paging.page,
      perPage: result.paging.perPage,
    },
  };
}

export async function getTransaction(
  token: string,
  transactionId: string,
): Promise<{ transaction: AeroTransaction }> {
  return aeroRequest<{ transaction: AeroTransaction }>(`/transaction/${transactionId}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------------------------------------------------------------------------
// Preauthorized transactions (authorize now, capture later)
// ---------------------------------------------------------------------------

export interface CreatePreauthInput {
  bankAccountId?: number;
  merchantId: number;
  /** Amount in dollars (converted to pennies via `dollarsToPennies` before the API call). */
  amount: { amount: number; currency: string };
  referenceId?: string;
  description?: string;
  attributes?: Record<string, unknown>;
}

/** Create a preauthorized transaction. Requires a `userForMerchant` token. */
export async function createPreauthTransaction(
  token: string,
  input: CreatePreauthInput,
): Promise<{ transaction: AeroPreauthTransaction }> {
  const idempotencyKey = crypto.randomUUID();
  return aeroRequest<{ transaction: AeroPreauthTransaction }>("/preauthTransaction", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}

export interface PreauthSearchParams {
  uuid?: string;
  /** Filter by preauth status, e.g. "live". */
  level?: string;
  page?: number;
  perPage?: number;
}

/** List preauthorized transactions. Requires a `merchant` token. */
export async function getPreauthTransactions(
  token: string,
  params: PreauthSearchParams = {},
): Promise<{ transactions: AeroPreauthTransaction[] }> {
  const qs = new URLSearchParams();
  if (params.uuid) qs.set("uuid", params.uuid);
  if (params.level) qs.set("level", params.level);
  qs.set("page", String(params.page ?? 1));
  qs.set("perPage", String(params.perPage ?? 50));

  const raw = await aeroRequest<{
    transactions?: Record<string, unknown>[];
  }>(`/preauthTransactions?${qs}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });

  return { transactions: (raw.transactions ?? []) as AeroPreauthTransaction[] };
}

/** Capture (execute) a preauthorized transaction. Requires a `merchant` token. */
export async function capturePreauthTransaction(
  token: string,
  preauthId: string,
): Promise<{ transaction: AeroPreauthTransaction }> {
  return aeroRequest<{ transaction: AeroPreauthTransaction }>("/capturePreauthTransaction", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: preauthId }),
  });
}

/** Cancel a preauthorized transaction before it is captured. */
export async function cancelPreauthTransaction(
  token: string,
  preauthId: string,
): Promise<{ transaction: AeroPreauthTransaction }> {
  return aeroRequest<{ transaction: AeroPreauthTransaction }>(`/preauthTransaction/${preauthId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

// ---------------------------------------------------------------------------
// Payout transactions (merchant → user's linked bank)
// ---------------------------------------------------------------------------

export interface CreatePayoutInput {
  /** Aeropay user id (UUID) receiving the payout. */
  userId: string;
  merchantId: number;
  /** Amount in dollars (converted to pennies via `dollarsToPennies` before the API call). */
  amount: { amount: number; currency: string };
  bankAccountId?: number;
  referenceId?: string;
  /** Defaults to ACH when omitted. */
  rtp?: boolean;
}

/** Create a payout from the merchant to a user. Requires a `merchant` token. */
export async function createPayoutTransaction(
  token: string,
  input: CreatePayoutInput,
): Promise<{ transaction: AeroTransaction }> {
  const idempotencyKey = crypto.randomUUID();
  return aeroRequest<{ transaction: AeroTransaction }>("/payoutTransaction", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface CreateWebhookInput {
  topic: string;
  url: string;
}

export async function createWebhook(
  token: string,
  input: CreateWebhookInput,
): Promise<Record<string, unknown>> {
  return aeroRequest<Record<string, unknown>>("/webhook", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// Re-export error class for route handlers
// ---------------------------------------------------------------------------
export { AeroPayError };
