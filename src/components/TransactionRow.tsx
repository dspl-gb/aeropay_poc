import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatMoney, txTypeLabel, type Transaction } from "@/lib/aeropay-store";

export function StatusBadge({ status }: { status: Transaction["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        status === "Completed" && "bg-success/12 text-success",
        status === "Pending" && "bg-warning/20 text-warning-foreground",
        status === "Failed" && "bg-destructive/10 text-destructive",
        status === "Authorized" && "bg-accent text-accent-foreground",
      )}
    >
      {status}
    </span>
  );
}

export function TransactionRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const received = tx.direction === "received";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          received ? "bg-success/12 text-success" : "bg-accent text-accent-foreground",
        )}
      >
        {received ? (
          <ArrowDownLeft className="size-[18px]" />
        ) : (
          <ArrowUpRight className="size-[18px]" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{tx.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {txTypeLabel(tx.type)} · {tx.note} · {formatDate(tx.date)}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span
          className={cn("text-sm font-semibold", received ? "text-success" : "text-foreground")}
        >
          {received ? "+" : "−"}
          {formatMoney(tx.amount)}
        </span>
        <StatusBadge status={tx.status} />
      </span>
    </button>
  );
}
