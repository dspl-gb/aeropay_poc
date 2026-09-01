"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Store } from "lucide-react";
import { toast } from "sonner";

import { BankLinkPrompt } from "@/components/BankLinkPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMoney,
  makeReference,
  sendPayment,
  useAeroPay,
  type Transaction,
} from "@/lib/aeropay-store";

type Step = "form" | "confirm" | "success";

const MERCHANT_NAME = "Aero Merchant";

export default function SendClient() {
  const { balance, bankAccounts, hasBankAccount } = useAeroPay();
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = Number.parseFloat(amount || "0");
  const valid = value > 0;
  const fee = 0;
  const bank = bankAccounts.find((b) => b.isSelected) ?? bankAccounts[0];

  async function handleSendPayment() {
    setSending(true);
    setError(null);
    const ref = makeReference();
    try {
      // Standard transaction: funds move from the customer's linked bank
      // account to the merchant (POST /v2/transaction).
      const tx = await sendPayment({
        bankAccountId: bank?.id,
        amount: value,
        referenceId: ref,
        description: note || "Payment to merchant",
      });
      setReceipt(tx);
      setStep("success");
      toast.success(`Payment of ${formatMoney(value)} sent to the merchant`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          {step !== "success" && step !== "form" && (
            <button
              onClick={() => setStep("form")}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {step === "form" && "Send Money"}
              {step === "confirm" && "Confirm payment"}
              {step === "success" && "Payment Sent Successfully"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "form" && "Pay the merchant straight from your linked bank."}
              {step === "confirm" && "Review the details before sending."}
              {step === "success" && "Your money is on its way."}
            </p>
          </div>
        </div>

        {!hasBankAccount && step !== "success" ? (
          <BankLinkPrompt />
        ) : (
          <>
            {step === "form" && (
              <form
                className="card-elevated mt-6 space-y-5 p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) setStep("confirm");
                }}
              >
                <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Store className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{MERCHANT_NAME}</p>
                    <p className="text-xs text-muted-foreground">
                      AeroPay only supports payments from a customer to the merchant.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder="120.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="h-11 rounded-xl text-lg font-semibold"
                  />
                  <p className="text-xs text-muted-foreground">
                    Available balance {formatMoney(balance)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="What's this for?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-20 rounded-xl"
                  />
                </div>
                {bank && (
                  <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
                    From {bank.bankName || "your linked bank"} ····
                    {bank.accountNumber.slice(-4)}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={!valid}
                  className="h-11 w-full rounded-xl text-sm font-semibold"
                >
                  Continue
                </Button>
              </form>
            )}

            {step === "confirm" && (
              <div className="card-elevated mt-6 p-6">
                <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  You&apos;re paying
                </p>
                <p className="mt-2 text-center text-4xl font-bold tracking-tight">
                  {formatMoney(value)}
                </p>
                <dl className="mt-6 space-y-3 rounded-2xl bg-secondary p-4 text-sm">
                  <Row label="To" value={MERCHANT_NAME} />
                  <Row
                    label="From"
                    value={
                      bank
                        ? `${bank.bankName || "Linked bank"} ····${bank.accountNumber.slice(-4)}`
                        : "Linked bank account"
                    }
                  />
                  <Row label="Note" value={note || "—"} />
                  <Row label="Transfer fee" value={formatMoney(fee)} />
                  <div className="h-px bg-border" />
                  <Row label="Total" value={formatMoney(value + fee)} strong />
                </dl>

                {error && (
                  <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  className="mt-6 h-11 w-full rounded-xl text-sm font-semibold"
                  onClick={handleSendPayment}
                  disabled={sending}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : "Send Payment"}
                </Button>
              </div>
            )}

            {step === "success" && receipt && (
              <div className="card-elevated mt-6 p-8 text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
                  <CheckCircle2 className="size-8" />
                </span>
                <p className="mt-5 text-3xl font-bold tracking-tight">
                  {formatMoney(receipt.amount)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">sent to {MERCHANT_NAME}</p>
                <div className="mt-6 rounded-2xl bg-secondary p-4 text-left text-sm">
                  <Row label="Reference" value={receipt.note || receipt.id} strong />
                  <div className="mt-3" />
                  <Row label="Status" value={receipt.status} />
                  <div className="mt-3" />
                  <Row label="Note" value={note || "—"} />
                </div>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-xl"
                    onClick={() => {
                      setStep("form");
                      setReceipt(null);
                      setAmount("");
                      setNote("");
                    }}
                  >
                    Send another
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-xl"
                    onClick={() => router.push("/transactions")}
                  >
                    View transactions
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold" : "font-medium"}>{value}</dd>
    </div>
  );
}
