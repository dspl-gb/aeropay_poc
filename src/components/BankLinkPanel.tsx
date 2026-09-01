"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchBankAccounts } from "@/lib/aeropay-store";
import type { WidgetSuccessPayload } from "aerosync-web-sdk";
import { AerosyncEnvironment, initAeroSyncWidget } from "aerosync-web-sdk";

type BankLinkPanelProps = {
  aeropayUserId: string;
  onLinked: () => void;
  onSkip?: () => void;
};

export function BankLinkPanel({ aeropayUserId, onLinked, onSkip }: BankLinkPanelProps) {
  const [step, setStep] = useState<"intro" | "linking" | "error">("intro");
  const [errorMsg, setErrorMsg] = useState("");
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

        await fetchBankAccounts();
        onLinked();
      } catch (err) {
        setStep("error");
        setErrorMsg((err as Error).message);
      }
    },
    [onLinked],
  );

  async function launchWidget() {
    setStep("linking");
    setErrorMsg("");

    try {
      const res = await fetch("/api/bank-accounts/link-url");
      const creds = await res.json();
      if (!res.ok || creds.error) {
        throw new Error(creds.error ?? "Failed to get bank linking credentials");
      }

      aggregatorRef.current =
        typeof creds.aggregator === "string" ? creds.aggregator : "aerosync";

      const configurationId =
        process.env.NEXT_PUBLIC_AEROSYNC_CONFIGURATION_ID ??
        (typeof creds.configurationId === "string" ? creds.configurationId : "");

      const widget = initAeroSyncWidget({
        elementId: "aerosync-widget-container-payout",
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
        aeroPassUserUuid: aeropayUserId,
        onSuccess: (event: WidgetSuccessPayload) => {
          if ("connectionId" in event) {
            handleSuccess({ connectionId: (event as { connectionId: string }).connectionId });
          } else if (
            "accounts" in event &&
            (event as { accounts: { connectionId: string }[] }).accounts.length > 0
          ) {
            handleSuccess({
              connectionId: (event as { accounts: { connectionId: string }[] }).accounts[0]
                .connectionId,
            });
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
        onLoad: () => {},
        onEvent: () => {},
      });

      widgetRef.current = widget;
      widget.launch();
    } catch (err) {
      setStep("error");
      setErrorMsg((err as Error).message);
    }
  }

  useEffect(() => {
    return () => {
      widgetRef.current = null;
    };
  }, []);

  if (step === "linking") {
    return (
      <div className="card-elevated mt-6 p-4">
        <p className="mb-3 text-center text-xs text-muted-foreground">
          Connect the bank account where you want to receive payouts. In sandbox, search for{" "}
          <strong>Aerobank</strong> and use username{" "}
          <code className="rounded bg-secondary px-1">sync</code> / password{" "}
          <code className="rounded bg-secondary px-1">no_mfa</code>. Enter OTP{" "}
          <code className="rounded bg-secondary px-1">0000</code> when prompted.
        </p>
        <div
          id="aerosync-widget-container-payout"
          className="flex min-h-[500px] items-center justify-center rounded-2xl border border-border bg-secondary/30"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading bank linking widget...</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="card-elevated mt-6 p-8 text-center">
        <p className="text-sm text-destructive">{errorMsg}</p>
        <Button className="mt-6 h-11 w-full rounded-xl" onClick={() => setStep("intro")}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="card-elevated mt-6 p-8 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Building2 className="size-8" />
      </span>
      <h2 className="mt-5 text-lg font-semibold">Link your bank account</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Payouts are sent directly to your linked checking account. Use the same email and mobile
        number you registered with so AeroPay can match your bank profile.
      </p>
      <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          Secure connection via Aerosync — credentials are never stored on our servers
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          Required before you can receive a payout
        </li>
      </ul>
      <Button
        className="mt-6 h-11 w-full rounded-xl text-sm font-semibold"
        onClick={launchWidget}
      >
        Connect bank account
      </Button>
      {onSkip && (
        <button
          onClick={onSkip}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Skip for now
        </button>
      )}
    </div>
  );
}
