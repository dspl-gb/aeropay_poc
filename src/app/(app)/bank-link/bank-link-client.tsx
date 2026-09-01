"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Building2, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchBankAccounts, useAeroPay } from "@/lib/aeropay-store";
import type { WidgetSuccessPayload } from "aerosync-web-sdk";
import { AerosyncEnvironment, initAeroSyncWidget } from "aerosync-web-sdk";

type Step = "intro" | "linking" | "success" | "error";

export default function BankLinkClient() {
  const router = useRouter();
  const { user } = useAeroPay();
  const [step, setStep] = useState<Step>("intro");
  const [errorMsg, setErrorMsg] = useState("");
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<{ launch?: () => void } | null>(null);

  const aggregatorRef = useRef("aerosync");

  const handleSuccess = useCallback(
    async (event: { connectionId?: string }) => {
      const connectionId = event.connectionId;
      if (!connectionId) {
        setStep("error");
        setErrorMsg("No connectionId received from Aerosync.");
        return;
      }

      try {
        const res = await fetch("/api/bank-accounts/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            aggregator: aggregatorRef.current,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          const message =
            typeof data.error === "string"
              ? data.error
              : typeof data.error?.message === "string"
                ? data.error.message
                : "Failed to link bank account";
          throw new Error(message);
        }

        // Refresh bank accounts in the store
        await fetchBankAccounts();
        setStep("success");
      } catch (err) {
        setStep("error");
        setErrorMsg((err as Error).message);
      }
    },
    [],
  );

  async function launchWidget() {
    setStep("linking");
    setErrorMsg("");

    try {
      // 1. Get the aggregator token/URL from our API
      const res = await fetch("/api/bank-accounts/link-url");
      const creds = await res.json();
      if (!res.ok || creds.error) {
        throw new Error(creds.error ?? "Failed to get bank linking credentials");
      }

      // 2. Dynamically load the Aerosync SDK
      // (already imported at top level; the bundler will code-split it)

      aggregatorRef.current =
        typeof creds.aggregator === "string" ? creds.aggregator : "aerosync";

      const configurationId =
        process.env.NEXT_PUBLIC_AEROSYNC_CONFIGURATION_ID ??
        (typeof creds.configurationId === "string" ? creds.configurationId : "");

      // 3. Initialize and launch the widget
      const widget = initAeroSyncWidget({
        elementId: "aerosync-widget-container",
        iframeTitle: "Connect your bank",
        environment: AerosyncEnvironment.Sandbox,
        token: creds.token ?? creds.url ?? creds.fastlinkURL ?? "",
        widgetLaunchType: "host",
        style: {
          width: "375px",
          height: "688px",
          bgColor: "#000000",
          opacity: 0.7,
        },
        deeplink: "",
        handleMFA: false,
        jobId: "",
        connectionId: "",
        configurationId,
        aeroPassUserUuid: user.id ?? "",
        onSuccess: (event: WidgetSuccessPayload) => {
          // Handle both single-account and multi-account success payloads
          if ("connectionId" in event) {
            handleSuccess({ connectionId: (event as { connectionId: string }).connectionId });
          } else if ("accounts" in event && (event as { accounts: { connectionId: string }[] }).accounts.length > 0) {
            handleSuccess({ connectionId: (event as { accounts: { connectionId: string }[] }).accounts[0].connectionId });
          } else {
            setStep("error");
            setErrorMsg("No connectionId received from Aerosync.");
          }
        },
        onClose: () => {
          setStep("intro");
        },
        onError: (event: string) => {
          setStep("error");
          setErrorMsg(typeof event === "string" ? event : "Bank linking failed");
        },
        onLoad: () => {
          // Widget loaded
        },
        onEvent: () => {
          // Widget event
        },
      });

      widgetRef.current = widget;
      widget.launch();
    } catch (err) {
      setStep("error");
      setErrorMsg((err as Error).message);
    }
  }

  // Clean up widget container on unmount
  useEffect(() => {
    return () => {
      widgetRef.current = null;
    };
  }, []);

  return (
    <>
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-3">
          {step !== "success" && (
            <button
              onClick={() => (step === "linking" ? setStep("intro") : router.back())}
              className="flex size-9 items-center justify-center rounded-full border border-border bg-surface"
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {step === "intro" && "Link your bank account"}
              {step === "linking" && "Connect your bank"}
              {step === "success" && "Bank linked successfully"}
              {step === "error" && "Something went wrong"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "intro" &&
                "Steps 3–5: Aerosync widget → connection ID → attach bank to your AeroPay user."}
              {step === "linking" && "Follow the steps in the Aerosync widget below."}
              {step === "success" &&
                "Bank attached. Transaction webhooks will arrive at /api/webhooks/aeropay."}
              {step === "error" && errorMsg}
            </p>
          </div>
        </div>

        {step === "intro" && (
          <div className="card-elevated mt-6 p-8 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Building2 className="size-8" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Why link your bank?</h2>
            <ul className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                Send and receive payments directly from your bank account
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                No card fees — bank transfers are the most cost-effective method
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                Your credentials are encrypted and never stored on our servers
              </li>
            </ul>
            <p className="mt-4 text-left text-xs text-muted-foreground">
              Sandbox: search for <strong>Aerobank</strong> and log in with username{" "}
              <code className="rounded bg-secondary px-1">sync</code> / password{" "}
              <code className="rounded bg-secondary px-1">no_mfa</code>.
            </p>
            <Button
              className="mt-6 h-11 w-full rounded-xl text-sm font-semibold"
              onClick={launchWidget}
            >
              Connect bank account
            </Button>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === "linking" && (
          <div className="mt-6">
            <p className="mb-3 text-center text-xs text-muted-foreground">
              Returning users may see a 4-digit OTP in the widget. In sandbox, with your
              designated{" "}
              <code className="rounded bg-secondary px-1">configurationId</code>, enter{" "}
              <code className="rounded bg-secondary px-1">0000</code> to proceed.
            </p>
            {/* Aerosync widget mounts here */}
            <div
              id="aerosync-widget-container"
              ref={widgetContainerRef}
              className="flex min-h-[500px] items-center justify-center rounded-2xl border border-border bg-secondary/30"
            >
              <div className="flex flex-col items-center gap-3 text-center">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading bank linking widget...
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="card-elevated mt-6 p-8 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/12 text-success">
              <CheckCircle2 className="size-8" />
            </span>
            <p className="mt-5 text-lg font-semibold">You&apos;re all set!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your bank account has been securely linked. You can now send and receive payments.
            </p>
            <Button
              className="mt-6 h-11 w-full rounded-xl text-sm font-semibold"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="card-elevated mt-6 p-8 text-center">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => setStep("intro")}
              >
                Try again
              </Button>
              <Button
                className="h-11 flex-1 rounded-xl"
                onClick={() => router.push("/dashboard")}
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
