"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Info, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AeroLogo } from "@/components/AeroLogo";
import { UsPhoneInput } from "@/components/UsPhoneInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { initialize } from "@/lib/aeropay-store";
import { isValidUsNationalPhone } from "@/lib/phone";

type Mode = "sign-in" | "sign-up";

export default function LoginClient() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialize().then(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          router.replace("/dashboard");
        }
        setCheckingSession(false);
      });
    });
  }, [router, supabase.auth]);

  async function saveProfile() {
    const res = await fetch("/api/user-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, phoneNumber, email }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error ?? "Failed to save profile");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        await saveProfile();
        toast.success("Account created. Head to Payout when you're ready.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        toast.success("Signed in");
      }

      await initialize();
      router.push("/dashboard");
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const signUpValid =
    mode === "sign-in" ||
    (firstName.trim() &&
      lastName.trim() &&
      isValidUsNationalPhone(phoneNumber) &&
      email.trim());

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[image:var(--gradient-brand)] p-12 lg:flex">
        <div className="flex items-center gap-3">
          <AeroLogo size={40} />
          <span className="text-lg font-semibold tracking-tight text-primary-foreground">
            AeroPay
          </span>
        </div>
        <div className="max-w-sm">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-primary-foreground">
            Your app login. AeroPay sandbox payouts.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80">
            Sign up with your legal identity details, then connect AeroPay and link your bank when
            you request your first payout.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-primary-foreground/75">
          <ShieldCheck className="size-4" />
          Supabase auth · AeroPay sandbox ·{" "}
          <a
            href="https://dev.aero.inc/docs/getting-started"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            API docs
          </a>
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 lg:hidden">
            <AeroLogo size={38} />
            <span className="text-lg font-semibold tracking-tight">AeroPay</span>
          </div>

          <h1 className="mt-8 text-2xl font-bold tracking-tight lg:mt-0">
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Sign in to your account."
              : "Enter details that match your government ID and bank account."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "sign-up" && (
              <>
                <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    First and last name must match your government ID. Mobile number and email must
                    be the same ones linked to your bank account — AeroPay uses them to verify your
                    identity when you link your bank.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      autoComplete="given-name"
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
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <UsPhoneInput
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required
                />
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl"
                required
              />
              {mode === "sign-up" && (
                <p className="text-xs text-muted-foreground">
                  Use the email address associated with your bank account.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-xl"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !email || password.length < 6 || !signUpValid}
              className="h-11 w-full rounded-xl text-sm font-semibold"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "sign-in" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "sign-in" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Disable email confirmation in your Supabase project for instant demo sign-up.
          </p>
        </div>
      </div>
    </div>
  );
}
