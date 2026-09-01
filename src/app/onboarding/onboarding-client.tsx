"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AeroLogo } from "@/components/AeroLogo";
import { UsPhoneInput } from "@/components/UsPhoneInput";
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
import { createClient } from "@/lib/supabase/client";
import { confirmAeroPay, initialize, setupAeroPay } from "@/lib/aeropay-store";
import { isValidUsNationalPhone } from "@/lib/phone";

const FLOW_STEPS = [
  "Authenticate (Supabase)",
  "Create AeroPay user",
  "Verify identity (MFA)",
  "Initialize bank linking",
  "Connect bank via Aerosync",
  "Attach bank to AeroPay user",
];

export default function OnboardingClient() {
  const router = useRouter();
  const supabase = createClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mfaOpen, setMfaOpen] = useState(false);
  const [mfaType, setMfaType] = useState<"sms" | "email">("sms");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [otp, setOtp] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const verifyingRef = useRef(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      setEmail(user.email ?? "");

      const status = await initialize();
      if (status.aeropayConnected) {
        router.replace(status.hasBankAccount ? "/dashboard" : "/bank-link");
        return;
      }

      setChecking(false);
    }

    load();
  }, [router, supabase.auth]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await setupAeroPay({ firstName, lastName, phoneNumber, email });
      if (result.needsMfa) {
        setMfaType(result.mfaType === "email" ? "email" : "sms");
        setPhoneLast4(result.phoneLast4 ?? "");
        setOtp("");
        setMfaError(null);
        setMfaOpen(true);
        return;
      }

      toast.success("AeroPay user connected");
      router.push(result.hasBankAccount ? "/dashboard" : "/bank-link");
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(code = otp) {
    if (code.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setConfirming(true);
    setMfaError(null);

    try {
      const result = await confirmAeroPay(code);
      setMfaOpen(false);
      toast.success("Identity verified");
      router.push(result.hasBankAccount ? "/dashboard" : "/bank-link");
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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const destination =
    mfaType === "email" ? "your email" : `***-***-${phoneLast4 || "••••"}`;

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <AeroLogo size={36} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connect AeroPay</h1>
            <p className="text-sm text-muted-foreground">
              Step 2: create your AeroPay user, then verify the one-time code.
            </p>
          </div>
        </div>

        <div className="card-elevated mt-8 p-6">
          <p className="text-sm font-semibold">Integration flow</p>
          <ol className="mt-4 space-y-2">
            {FLOW_STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    index === 0
                      ? "bg-success/15 text-success"
                      : index === 1 || index === 2
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={index <= 2 ? "text-foreground" : "text-muted-foreground"}>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <form className="card-elevated mt-6 space-y-4 p-6" onSubmit={handleConnect}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="size-4 text-primary" />
            AeroPay user details
          </div>
          <p className="text-xs text-muted-foreground">
            New users and network users (already on AeroPay with another merchant) both receive an
            MFA code after you submit.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
            </div>
          </div>

          <UsPhoneInput value={phoneNumber} onChange={setPhoneNumber} required />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !firstName || !lastName || !isValidUsNationalPhone(phoneNumber)}
            className="h-11 w-full rounded-xl text-sm font-semibold"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Create AeroPay user
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Next: verify identity, then link a bank with the Aerosync widget
        </p>
      </div>

      <Dialog open={mfaOpen} onOpenChange={(open) => !confirming && setMfaOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verify your identity</DialogTitle>
            <DialogDescription>
              Please enter the verification code sent to {destination}
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
              Code expires in 15 minutes. In sandbox you can enter{" "}
              <code className="rounded bg-secondary px-1">000000</code>.
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
    </div>
  );
}
