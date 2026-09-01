import Link from "next/link";
import { Landmark } from "lucide-react";

/**
 * Shown on transaction pages when the user has no linked bank account yet.
 * All AeroPay money movement requires a linked bank first.
 */
export function BankLinkPrompt() {
  return (
    <div className="card-elevated mt-6 p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Landmark className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">Link your bank account first</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        Payments move directly between your bank and the merchant. Connect a checking account to
        continue — it only takes a minute.
      </p>
      <Link
        href="/bank-link"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Link a bank account
      </Link>
    </div>
  );
}
