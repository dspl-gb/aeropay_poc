"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { StatusBadge, TransactionRow } from "@/components/TransactionRow";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  formatDate,
  formatMoney,
  txTypeLabel,
  useAeroPay,
  fetchTransactions,
  type Transaction,
} from "@/lib/aeropay-store";

export default function TransactionsClient() {
  const { transactions, isLoading } = useAeroPay();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);

  function handleRefresh() {
    fetchTransactions();
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((tx) => tx.direction === "received")
      .filter((tx) => {
        if (q === "") return true;
        return [tx.name, tx.email, tx.note, tx.id].some((f) => f.toLowerCase().includes(q));
      });
  }, [transactions, query]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {results.length} payout{results.length === 1 ? "" : "s"}
        {isLoading && " · Loading..."}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, note or reference"
            className="h-11 rounded-xl bg-surface pl-10"
          />
        </div>
        <button
          onClick={handleRefresh}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      <section className="card-elevated mt-4 divide-y divide-border p-2 md:p-4">
        {results.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} onClick={() => setSelected(tx)} />
        ))}
        {results.length === 0 && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No payouts yet. Request one from the Payout page.
          </p>
        )}
      </section>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Transaction details</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="px-4 pb-6">
              <p className="text-3xl font-bold tracking-tight">
                {selected.direction === "received" ? "+" : "−"}
                {formatMoney(selected.amount)}
              </p>
              <div className="mt-2">
                <StatusBadge status={selected.status} />
              </div>
              <dl className="mt-6 space-y-3 rounded-2xl bg-secondary p-4 text-sm">
                <Detail label="Type" value={txTypeLabel(selected.type)} />
                <Detail
                  label={selected.direction === "received" ? "From" : "To"}
                  value={selected.name}
                />
                <Detail label="Email" value={selected.email} />
                <Detail label="Note" value={selected.note} />
                <Detail label="Method" value={selected.method} />
                <Detail label="Date" value={formatDate(selected.date)} />
                <Detail label="Reference" value={selected.id} />
              </dl>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
