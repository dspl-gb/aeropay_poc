"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, HandCoins, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BankLinkPanel } from "@/components/BankLinkPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmAeroPay,
  formatMoney,
  initialize,
  makeReference,
  requestPayout,
  setupAeroPayFromStored,
  useAeroPay,
  type Transaction,
} from "@/lib/aeropay-store";

export default function PayoutClient() {
  const { hasBankAccount, bankAccounts, aeropayConnected, user, isLoading } = useAeroPay();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [rtp, setRtp] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Transaction | null>(null);

  const [booting, setBooting] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaType, setMfaType] = useState<"sms" | "email">("sms");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [otp, setOtp] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  const value = Number.parseFloat(amount || "0");
  const valid = value > 0;
  const bank = bankAccounts.find((b) => b.isSelected) ?? bankAccounts[0];

  useEffect(() => {
    initialize().finally(() => setBooting(false));
  }, []);

  async function connectAeroPay() {
    setConnecting(true);
    setSetupError(null);

    try {
      const result = await setupAeroPayFromStored();
      if (result.needsMfa) {
        setMfaType(result.mfaType === "email" ? "email" : "sms");
        setPhoneLast4(result.phoneLast4 ?? "");
        setOtp("");
        setMfaError(null);
        setMfaOpen(true);
        return;
      }
      toast.success("AeroPay account connected");
      setConnecting(false);
    } catch (err) {
      const msg = (err as Error).message;
      setSetupError(msg);
      toast.error(msg);
      setConnecting(false);
    }
  }

  async function handleVerify(code = otp) {
    if (code.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setConfirming(true);
    setMfaError(null);

    try {
      await confirmAeroPay(code);
      setMfaOpen(false);
      setConnecting(false);
      toast.success("Identity verified");
    } catch (err) {
      const msg = (err as Error).message;
      setMfaError(msg);
      toast.error(msg);
      setOtp("");
    } finally {
      verifyingRef.current = false;
      setConfirming(false);
    }
  }

  async function handlePayout() {
    setSending(true);
    setError(null);
    try {
      const tx = await requestPayout({
        amount: value,
        referenceId: makeReference(),
        rtp,
        ...(bank ? { bankAccountId: bank.id } : {}),
      });
      setReceipt(tx);
      toast.success(`Payout of ${formatMoney(value)} initiated`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  const destination =
    mfaType === "email" ? "your email" : `***-***-${phoneLast4 || "••••"}`;

  if (booting || (isLoading && !aeropayConnected)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-lg">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <HandCoins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Receive a payout</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect AeroPay, link your bank, and request a payout to your account.
            </p>
          </div>
        </div>

        {!aeropayConnected ? (
          <div className="card-elevated mt-6 p-8 text-center">
            {connecting ? (
              <>
                <Loader2 className="mx-auto size-8 animate-spin text-primary" />
                <p className="mt-4 text-sm font-medium">Creating your AeroPay account…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Using the profile you saved at sign-up. You may be asked to verify with a code.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Connect AeroPay to receive a payout</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  We only create your AeroPay user when you choose to start a payout. Your app
                  account stays separate until then.
                </p>
                {setupError && (
                  <>
                    <p className="mt-4 text-sm text-destructive">{setupError}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Make sure you completed sign-up with your legal name, mobile, and email.
                    </p>
                  </>
                )}
                <Button className="mt-6 h-11 w-full rounded-xl" onClick={() => void connectAeroPay()}>
                  {setupError ? "Try again" : "Connect AeroPay"}
                </Button>
              </>
            )}
          </div>
        ) : !hasBankAccount ? (
          <BankLinkPanel aeropayUserId={user.id} onLinked={() => toast.success("Bank linked")} />
        ) : receipt ? (
          <div className="card-elevated mt-6 p-8 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-8" />
            </span>
            <p className="mt-5 text-3xl font-bold tracking-tight">{formatMoney(receipt.amount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">payout on its way to your bank</p>
            <div className="mt-6 space-y-3 rounded-2xl bg-secondary p-4 text-left text-sm">
              <Row label="Reference" value={receipt.note || receipt.id} strong />
              <Row label="Status" value={receipt.status} />
              <Row label="Method" value={rtp ? "RTP / FedNow (ACH fallback)" : "Same-day ACH"} />
              <Row
                label="Destination"
                value={
                  bank
                    ? `${bank.bankName || "Linked bank"} ····${bank.accountNumber.slice(-4)}`
                    : "Linked bank account"
                }
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              ACH payouts typically settle within 1–2 business days.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => {
                  setReceipt(null);
                  setAmount("");
                  setNote("");
                  setRtp(false);
                }}
              >
                New payout
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl"
                onClick={() => router.push("/transactions")}
              >
                View transactions
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="card-elevated mt-6 space-y-5 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) handlePayout();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="amount">Payout amount (USD)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="250.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-11 rounded-xl text-lg font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Reason (optional)</Label>
              <Textarea
                id="note"
                placeholder="e.g. Cashback reward"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-20 rounded-xl"
              />
            </div>
            {bank && (
              <p className="rounded-xl bg-secondary px-4 py-3 text-xs text-muted-foreground">
                Deposits into {bank.bankName || "your linked bank"} ····
                {bank.accountNumber.slice(-4)}
              </p>
            )}
            <div className="flex items-start justify-between gap-4 rounded-xl bg-secondary px-4 py-3">
              <div>
                <p className="text-sm font-medium">Instant deposit</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Attempt via RTP/FedNow; falls back to same-day ACH if the bank doesn&apos;t
                  support it.
                </p>
              </div>
              <Switch
                id="rtp"
                checked={rtp}
                onCheckedChange={setRtp}
                aria-label="Instant deposit"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={!valid || sending}
              className="h-11 w-full rounded-xl text-sm font-semibold"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : "Request payout"}
            </Button>
          </form>
        )}
      </div>

      <Dialog
        open={mfaOpen}
        onOpenChange={(open) => {
          if (confirming) return;
          setMfaOpen(open);
          if (!open) setConnecting(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your identity</DialogTitle>
            <DialogDescription>
              Enter the verification code sent to {destination}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              onComplete={(value) => void handleVerify(value)}
              disabled={confirming}
              autoFocus
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, index) => (
                  <InputOTPSlot key={index} index={index} className="h-11 w-10 text-base" />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-center text-xs text-muted-foreground">
              Sandbox code: <code className="rounded bg-secondary px-1">000000</code>
            </p>
            {mfaError && (
              <p className="w-full rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                {mfaError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              className="h-11 w-full rounded-xl text-sm font-semibold"
              disabled={confirming || otp.length !== 6}
              onClick={() => void handleVerify()}
            >
              {confirming ? <Loader2 className="size-4 animate-spin" /> : "Verify and continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
