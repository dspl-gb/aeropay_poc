import { useSyncExternalStore } from "react";

import { penniesToDollars } from "./aeropay-amount";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TxStatus = "Completed" | "Pending" | "Failed" | "Authorized";
export type TxDirection = "sent" | "received";
export type TxType = "payment" | "payment+" | "payout" | "reversal";

export type Transaction = {
  id: string;
  name: string;
  email: string;
  note: string;
  amount: number;
  direction: TxDirection;
  status: TxStatus;
  date: string;
  method: string;
  type: TxType;
};

/** A preauthorized transaction (authorize now, capture later). */
export type PreauthTx = {
  id: string;
  /** Dollars. */
  amount: number;
  currency: string;
  status: string;
  referenceId?: string;
  description?: string;
  createdDate?: string;
  expiryDate?: string;
};

export type AeroUser = {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  initials: string;
  memberSince: string;
};

export type BankAccount = {
  id: number;
  accountType: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  isSelected: boolean;
  status: string;
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type State = {
  user: AeroUser;
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  preauths: PreauthTx[];
  balance: number;
  isAuthenticated: boolean;
  aeropayConnected: boolean;
  hasBankAccount: boolean;
  isLoading: boolean;
  error: string | null;
  transactionsPaging: { total: number; page: number; perPage: number };
};

const defaultUser: AeroUser = {
  name: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  initials: "",
  id: "",
  memberSince: "",
};

let state: State = {
  user: defaultUser,
  bankAccounts: [],
  transactions: [],
  preauths: [],
  balance: 0,
  isAuthenticated: false,
  aeropayConnected: false,
  hasBankAccount: false,
  isLoading: false,
  error: null,
  transactionsPaging: { total: 0, page: 1, perPage: 50 },
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getState() {
  return state;
}

export function useAeroPay() {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Keep the named `user` export for backward compat (profile page, AppShell)
export let user: AeroUser = defaultUser;

// ---------------------------------------------------------------------------
// Helpers shared with components
// ---------------------------------------------------------------------------

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export function makeReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `APX-${out}`;
}

/** Human label for an AeroPay `paymentType`. */
export function txTypeLabel(type: TxType | string): string {
  switch (type) {
    case "payout":
      return "Payout";
    case "reversal":
      return "Refund";
    case "payment+":
      return "Payment · tip";
    default:
      return "Payment";
  }
}

/** Human label for a preauth status (live / captured / canceled / expired). */
export function preauthStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "live":
      return "Authorized";
    case "captured":
      return "Captured";
    case "canceled":
    case "cancelled":
      return "Canceled";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

// ---------------------------------------------------------------------------
// Client-side API helpers
// ---------------------------------------------------------------------------

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

/** Map an AeroPay API transaction object to our UI Transaction type. */
function mapAeroTx(tx: Record<string, unknown>): Transaction {
  const amountObj = tx.amount as { amount?: number; value?: number; currency?: string } | undefined;
  const rawAmount = amountObj?.amount ?? amountObj?.value ?? 0;
  const pennies = typeof rawAmount === "number" ? rawAmount : Number(rawAmount) || 0;
  const amount = penniesToDollars(pennies);

  const paymentType = (tx.paymentType as string) ?? "payment";
  // payout + reversal credit the customer; everything else debits them.
  const direction: TxDirection =
    paymentType === "payout" || paymentType === "reversal" ? "received" : "sent";

  // Map status strings (@see https://dev.aero.inc/docs/transaction-status)
  const rawStatus = ((tx.status as string) ?? "pending").toLowerCase();
  let status: TxStatus = "Pending";
  if (["completed", "cleared", "settled", "processed", "resolved"].includes(rawStatus)) {
    status = "Completed";
  }
  if (
    [
      "failed",
      "declined",
      "rejected",
      "returned",
      "void",
      "canceled",
      "cancelled",
      "expired",
    ].includes(rawStatus)
  ) {
    status = "Failed";
  }

  return {
    id: (tx.id as string) ?? "",
    name: (tx.title as string) ?? (tx.referenceId as string) ?? "Transaction",
    email: "",
    note: (tx.referenceId as string) ?? (tx.description as string) ?? "",
    amount,
    direction,
    status,
    date: (tx.createdDate as string) ?? new Date().toISOString(),
    method: paymentType || "AeroPay",
    type: (["payment", "payment+", "payout", "reversal"].includes(paymentType)
      ? paymentType
      : "payment") as TxType,
  };
}

/** Map an AeroPay preauth transaction object to the UI PreauthTx type. */
function mapPreauth(raw: Record<string, unknown>): PreauthTx {
  const amountObj = raw.amount as { amount?: number; currency?: string } | undefined;
  const amount = penniesToDollars(Number(amountObj?.amount ?? 0) || 0);
  return {
    id: String(raw.id ?? ""),
    amount,
    currency: amountObj?.currency ?? "USD",
    status: String(raw.status ?? "live"),
    referenceId: raw.referenceId ? String(raw.referenceId) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    createdDate: raw.createdDate ? String(raw.createdDate) : undefined,
    expiryDate: raw.expiryDate ? String(raw.expiryDate) : undefined,
  };
}

function computeBalance(txs: Transaction[]): number {
  return txs.reduce((sum, tx) => {
    if (tx.status !== "Completed") return sum;
    return tx.direction === "received" ? sum + tx.amount : sum - tx.amount;
  }, 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUser(raw: Record<string, any>): AeroUser {
  const firstName = raw.firstName ?? "";
  const lastName = raw.lastName ?? "";
  return {
    id: raw.id ?? "",
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: raw.email ?? "",
    phone: raw.phoneNumber ?? "",
    initials: `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(),
    memberSince: raw.createdDate
      ? new Date(raw.createdDate).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "",
  };
}

// ---------------------------------------------------------------------------
// Actions — auth
// ---------------------------------------------------------------------------

/** Check Supabase + AeroPay session on app load. */
export async function initialize(): Promise<{
  aeropayConnected: boolean;
  hasBankAccount: boolean;
}> {
  setState({ isLoading: true, error: null });
  try {
    const session = await apiFetch<{
      authenticated: boolean;
      aeropayConnected?: boolean;
      hasBankAccount?: boolean;
      user?: Record<string, unknown>;
      supabaseUser?: { id: string; email?: string };
      storedProfile?: {
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
      } | null;
    }>("/api/auth/session");

    if (!session.authenticated) {
      setState({
        isAuthenticated: false,
        aeropayConnected: false,
        hasBankAccount: false,
        isLoading: false,
      });
      return { aeropayConnected: false, hasBankAccount: false };
    }

    if (!session.aeropayConnected || !session.user) {
      const stored = session.storedProfile;
      const fallbackUser: AeroUser = stored
        ? {
            id: "",
            firstName: stored.firstName,
            lastName: stored.lastName,
            name: `${stored.firstName} ${stored.lastName}`.trim(),
            email: stored.email || session.supabaseUser?.email || "",
            phone: stored.phoneNumber,
            initials: `${stored.firstName[0] ?? ""}${stored.lastName[0] ?? ""}`.toUpperCase(),
            memberSince: "",
          }
        : {
            ...defaultUser,
            email: session.supabaseUser?.email ?? "",
          };

      user = fallbackUser;
      setState({
        user: fallbackUser,
        isAuthenticated: true,
        aeropayConnected: false,
        hasBankAccount: false,
        isLoading: false,
      });
      return { aeropayConnected: false, hasBankAccount: false };
    }

    const u = buildUser(session.user);
    user = u;

    const [bankRes, txRes] = await Promise.all([
      apiFetch<{ bankAccounts?: BankAccount[] }>("/api/bank-accounts").catch(() => ({
        bankAccounts: [],
      })),
      apiFetch<{
        transactions?: Record<string, unknown>[];
        paging?: { total: number; page: number; perPage: number };
      }>("/api/transactions?page=1&perPage=50").catch(() => ({
        transactions: [],
        paging: { total: 0, page: 1, perPage: 50 },
      })),
    ]);

    const bankAccounts = bankRes.bankAccounts ?? [];
    const transactions = (txRes.transactions ?? []).map(mapAeroTx);
    const paging = txRes.paging ?? { total: 0, page: 1, perPage: 50 };
    const hasBankAccount = session.hasBankAccount ?? bankAccounts.length > 0;

    setState({
      user: u,
      bankAccounts,
      transactions,
      balance: computeBalance(transactions),
      isAuthenticated: true,
      aeropayConnected: true,
      hasBankAccount,
      isLoading: false,
      transactionsPaging: paging,
    });

    return { aeropayConnected: true, hasBankAccount };
  } catch {
    setState({
      isAuthenticated: false,
      aeropayConnected: false,
      hasBankAccount: false,
      isLoading: false,
    });
    return { aeropayConnected: false, hasBankAccount: false };
  }
}

/**
 * Connect AeroPay using profile fields saved at sign-up.
 */
export async function setupAeroPayFromStored(): Promise<{
  needsMfa: boolean;
  mfaType: string | null;
  phoneLast4?: string;
  hasBankAccount: boolean;
}> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{
      needsMfa?: boolean;
      mfaType?: string | null;
      phoneLast4?: string;
      user?: Record<string, string>;
      hasBankAccount?: boolean;
    }>("/api/aeropay/setup", {
      method: "POST",
      body: JSON.stringify({ useStoredProfile: true }),
    });

    if (data.needsMfa) {
      setState({ isLoading: false });
      return {
        needsMfa: true,
        mfaType: data.mfaType ?? "sms",
        phoneLast4: data.phoneLast4,
        hasBankAccount: false,
      };
    }

    await hydrateAfterConnect(data.user ?? {}, data.hasBankAccount ?? false);
    return { needsMfa: false, mfaType: null, hasBankAccount: data.hasBankAccount ?? false };
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

/**
 * Connect the signed-in Supabase user to AeroPay (POST /v2/user).
 * When MFA is required, returns needsMfa so the UI can collect the OTP.
 */
export async function setupAeroPay(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
}): Promise<{
  needsMfa: boolean;
  mfaType: string | null;
  phoneLast4?: string;
  hasBankAccount: boolean;
}> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{
      needsMfa?: boolean;
      mfaType?: string | null;
      phoneLast4?: string;
      user?: Record<string, string>;
      hasBankAccount?: boolean;
    }>("/api/aeropay/setup", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (data.needsMfa) {
      setState({ isLoading: false });
      return {
        needsMfa: true,
        mfaType: data.mfaType ?? "sms",
        phoneLast4: data.phoneLast4,
        hasBankAccount: false,
      };
    }

    await hydrateAfterConnect(data.user ?? {}, data.hasBankAccount ?? false);
    return { needsMfa: false, mfaType: null, hasBankAccount: data.hasBankAccount ?? false };
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

/**
 * Verify the AeroPay OTP (POST /v2/confirmUser) and persist the user.
 * Sandbox accepts 000000.
 */
export async function confirmAeroPay(code: string): Promise<{ hasBankAccount: boolean }> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{
      user: Record<string, string>;
      hasBankAccount: boolean;
    }>("/api/aeropay/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    await hydrateAfterConnect(data.user, data.hasBankAccount);
    return { hasBankAccount: data.hasBankAccount };
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

async function hydrateAfterConnect(rawUser: Record<string, unknown>, hasBankAccount: boolean) {
  const u = buildUser(rawUser);
  user = u;

  const [bankRes, txRes] = await Promise.all([
    apiFetch<{ bankAccounts?: BankAccount[] }>("/api/bank-accounts").catch(() => ({
      bankAccounts: [],
    })),
    apiFetch<{
      transactions?: Record<string, unknown>[];
      paging?: { total: number; page: number; perPage: number };
    }>("/api/transactions?page=1&perPage=50").catch(() => ({
      transactions: [],
      paging: { total: 0, page: 1, perPage: 50 },
    })),
  ]);

  const bankAccounts = bankRes.bankAccounts ?? [];
  const transactions = (txRes.transactions ?? []).map(mapAeroTx);

  setState({
    user: u,
    bankAccounts,
    transactions,
    balance: computeBalance(transactions),
    isAuthenticated: true,
    aeropayConnected: true,
    hasBankAccount,
    isLoading: false,
    transactionsPaging: txRes.paging ?? { total: 0, page: 1, perPage: 50 },
  });
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  user = defaultUser;
  setState({
    user: defaultUser,
    bankAccounts: [],
    transactions: [],
    preauths: [],
    balance: 0,
    isAuthenticated: false,
    aeropayConnected: false,
    hasBankAccount: false,
    isLoading: false,
    error: null,
  });
}

// ---------------------------------------------------------------------------
// Actions — transactions
// ---------------------------------------------------------------------------

export async function fetchTransactions(page = 1, perPage = 50) {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{
      transactions?: Record<string, unknown>[];
      paging?: { total: number; page: number; perPage: number };
    }>(`/api/transactions?page=${page}&perPage=${perPage}`);

    const transactions = (data.transactions ?? []).map(mapAeroTx);
    setState({
      transactions,
      balance: computeBalance(transactions),
      isLoading: false,
      transactionsPaging: data.paging ?? { total: 0, page, perPage },
    });
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
  }
}

export async function sendPayment(tx: {
  bankAccountId?: number;
  amount: number;
  referenceId?: string;
  description?: string;
}): Promise<Transaction> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{ transaction: Record<string, unknown> }>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(tx),
    });

    const mapped = mapAeroTx(data.transaction);

    setState({
      transactions: [mapped, ...state.transactions],
      balance: computeBalance([mapped, ...state.transactions]),
      isLoading: false,
    });

    return mapped;
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Actions — preauthorized transactions (authorize now, pay later)
// ---------------------------------------------------------------------------

/** Load the user's preauthorizations (AeroPay is the system of record). */
export async function fetchPreauths() {
  try {
    const data = await apiFetch<{ transactions?: Record<string, unknown>[] }>("/api/preauth");
    setState({ preauths: (data.transactions ?? []).map(mapPreauth) });
  } catch (err) {
    setState({ error: (err as Error).message });
  }
}

/** Customer authorizes a future payment — no money moves yet. */
export async function createPreauth(input: {
  amount: number;
  referenceId?: string;
  description?: string;
}): Promise<PreauthTx> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{ transaction: Record<string, unknown> }>("/api/preauth", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const mapped = mapPreauth(data.transaction);
    setState({
      preauths: [mapped, ...state.preauths.filter((p) => p.id !== mapped.id)],
      isLoading: false,
    });
    return mapped;
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

/** Capture (execute) an authorized payment — funds move to the merchant. */
export async function capturePreauthTx(id: string): Promise<void> {
  setState({ isLoading: true, error: null });
  try {
    await apiFetch<{ transaction: Record<string, unknown> }>(`/api/preauth/${id}/capture`, {
      method: "POST",
    });
    // The capture creates a real transaction; refresh both lists.
    await Promise.all([fetchPreauths(), fetchTransactions()]);
    setState({ isLoading: false });
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

/** Cancel an authorization before it is captured. */
export async function cancelPreauthTx(id: string): Promise<void> {
  setState({ isLoading: true, error: null });
  try {
    await apiFetch(`/api/preauth/${id}`, { method: "DELETE" });
    await fetchPreauths();
    setState({ isLoading: false });
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Actions — payouts (merchant → customer's linked bank)
// ---------------------------------------------------------------------------

/** Merchant pays the customer; funds land in the customer's linked bank. */
export async function requestPayout(input: {
  amount: number;
  referenceId?: string;
  rtp?: boolean;
  bankAccountId?: number;
}): Promise<Transaction> {
  setState({ isLoading: true, error: null });
  try {
    const data = await apiFetch<{ transaction: Record<string, unknown> }>("/api/payouts", {
      method: "POST",
      body: JSON.stringify(input),
    });

    const mapped = mapAeroTx(data.transaction);
    setState({
      transactions: [mapped, ...state.transactions],
      balance: computeBalance([mapped, ...state.transactions]),
      isLoading: false,
    });
    return mapped;
  } catch (err) {
    setState({ isLoading: false, error: (err as Error).message });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Actions — bank accounts
// ---------------------------------------------------------------------------

export async function fetchBankAccounts() {
  try {
    const data = await apiFetch<{ bankAccounts?: BankAccount[] }>("/api/bank-accounts");
    const bankAccounts = data.bankAccounts ?? [];
    setState({
      bankAccounts,
      hasBankAccount: bankAccounts.length > 0,
    });
  } catch (err) {
    setState({ error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Activity chart data (computed from transactions)
// ---------------------------------------------------------------------------

export function getActivityData() {
  const months: Record<string, { sent: number; received: number }> = {};
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  for (const tx of state.transactions) {
    if (tx.status !== "Completed") continue;
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!months[key]) months[key] = { sent: 0, received: 0 };
    if (tx.direction === "sent") months[key].sent += tx.amount;
    else months[key].received += tx.amount;
  }

  // Return last 6 months
  const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  const last6 = sorted.slice(-6);

  if (last6.length === 0) {
    // Fallback: return placeholder data
    return [
      { label: "Mar", sent: 0, received: 0 },
      { label: "Apr", sent: 0, received: 0 },
      { label: "May", sent: 0, received: 0 },
      { label: "Jun", sent: 0, received: 0 },
      { label: "Jul", sent: 0, received: 0 },
      { label: "Aug", sent: 0, received: 0 },
    ];
  }

  return last6.map(([key, val]) => {
    const monthIdx = Number(key.split("-")[1]);
    return { label: labels[monthIdx] ?? "?", ...val };
  });
}
