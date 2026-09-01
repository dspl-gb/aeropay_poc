"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BankLinkPrompt } from "@/components/BankLinkPrompt";
import { StatusBadge } from "@/components/TransactionRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cancelPreauthTx,
  capturePreauthTx,
  createPreauth,
  fetchPreauths,
  formatDate,
  formatMoney,
  makeReference,
  preauthStatusLabel,
  useAeroPay,
  type PreauthTx,
  type TxStatus,
} from "@/lib/aeropay-store";

function preauthBadgeStatus(status: string): TxStatus {
  switch (status.toLowerCase()) {
    case "live":
      return "Authorized";
    case "captured":
      return "Completed";
    default:
      return "Failed";
  }
}

export default function PreauthClient() {
  const { preauths, hasBankAccount, bankAccounts, user } = useAeroPay();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState<PreauthTx | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchPreauths();
  }, []);

  const value = Number.parseFloat(amount || "0");
  const valid = value > 0;
  const bank = bankAccounts.find((b) => b.isSelected) ?? bankAccounts[0];

  async function handleAuthorize() {
    setAuthorizing(true);
    try {
      const preauth = await createPreauth({
        amount: value,
        referenceId: makeReference(),
        description: note || "Preauthorized payment",
      });
      setAuthorized(preauth);
      setAmount("");
      setNote("");
      toast.success(`Authorization for ${formatMoney(value)} saved`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAuthorizing(false);
    }
  }

  async function handleCapture(id: string, preauthAmount: number) {
    setBusyId(id);
    try {
      await capturePreauthTx(id);
      toast.success(`Payment of ${formatMoney(preauthAmount)} completed`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await cancelPreauthTx(id);
      toast.success("Authorization canceled");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-lg">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Authorize a payment</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Approve a payment now — the merchant captures the funds later from your linked bank.
              No money moves until capture.
            </p>
          </div>
        </div>

        {!hasBankAccount ? (
          <BankLinkPrompt />
        ) : (
          <>
            {authorized && (
              <div className="card-elevated mt-6 p-6 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/12 text-success">
                  <CheckCircle2 className="size-7" />
                </span>
                <p className="mt-4 text-2xl font-bold tracking-tight">
                  {formatMoney(authorized.amount)} authorized
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stored securely with AeroPay — pay now anytime, or cancel.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="h-11 flex-1 rounded-xl"
                    disabled={busyId === authorized.id}
                    onClick={() => handleCapture(authorized.id, authorized.amount)}
                  >
                    {busyId === authorized.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Pay now"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl"
                    onClick={() => setAuthorized(null)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {!authorized && (
              <form
                className="card-elevated mt-6 space-y-5 p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) handleAuthorize();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to authorize (USD)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="75.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="h-11 rounded-xl text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the maximum the merchant may charge. Authorizations expire after 72
                    hours if not captured.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Textarea
                    id="note"
                    placeholder="e.g. Tab at Aero Lounge"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-20 rounded-xl"
                  />
                </div>
                {bank && (
                  <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
                    From {bank.bankName || "linked bank"} ····
                    {bank.accountNumber.slice(-4)} ({user.firstName} {user.lastName})
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={!valid || authorizing}
                  className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                  {authorizing ? <Loader2 className="size-4 animate-spin" /> : "Authorize payment"}
                </Button>
              </form>
            )}

            <section className="mt-8">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">Your authorizations</h2>
                <button
                  onClick={() => fetchPreauths()}
                  className="text-xs font-semibold text-primary"
                >
                  Refresh
                </button>
              </div>
              <div className="card-elevated mt-2 divide-y divide-border p-2">
                {preauths.length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No authorizations yet.
                  </p>
                )}
                {preauths.map((p) => {
                  const live = p.status.toLowerCase() === "live";
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {formatMoney(p.amount)}
                          <span className="ml-2 text-xs font-medium text-muted-foreground">
                            {p.description ?? p.referenceId ?? ""}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {preauthStatusLabel(p.status)}
                          {p.createdDate ? ` · ${formatDate(p.createdDate)}` : ""}
                          {p.expiryDate && live ? ` · expires ${formatDate(p.expiryDate)}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={preauthBadgeStatus(p.status)} />
                      {live && (
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs"
                            disabled={busyId === p.id}
                            onClick={() => handleCapture(p.id, p.amount)}
                          >
                            {busyId === p.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Pay now"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg px-3 text-xs"
                            disabled={busyId === p.id}
                            onClick={() => handleCancel(p.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
