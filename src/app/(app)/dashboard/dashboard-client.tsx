"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, HandCoins, Receipt } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

import { TransactionRow } from "@/components/TransactionRow";
import { formatMoney, useAeroPay, getActivityData } from "@/lib/aeropay-store";

export default function DashboardClient() {
  const { balance, transactions, user } = useAeroPay();
  const router = useRouter();
  const activityData = getActivityData();
  const greetingName = user.firstName || user.name || "there";

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back, {greetingName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Request a payout or review your transaction history.
      </p>

      {/* <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="rounded-3xl bg-[image:var(--gradient-brand)] p-6 shadow-[var(--shadow-brand)] lg:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/75">
            Total balance
          </p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-primary-foreground">
            {formatMoney(balance)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-primary-foreground/80">
            <ArrowUpRight className="size-3.5" /> Based on completed transactions
          </p>
          <p className="mt-8 text-xs text-primary-foreground/70">
            AeroPay · {user.name || user.email}
          </p>
        </div>

        <div className="card-elevated p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Payment activity</h2>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </div>
          <div className="mt-4 h-[168px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--color-border)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2.5}
                  fill="url(#in)"
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div> */}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <QuickAction icon={HandCoins} label="Payout" onClick={() => router.push("/payout")} />
        <QuickAction
          icon={Receipt}
          label="Transactions"
          onClick={() => router.push("/transactions")}
        />
      </div>

      <section className="card-elevated mt-4 p-4 md:p-6">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold">Recent transactions</h2>
          <Link href="/transactions" className="text-xs font-semibold text-primary">
            View all
          </Link>
        </div>
        <div className="mt-2 divide-y divide-border">
          {transactions.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              No transactions yet. Go to Payout to connect AeroPay and request your first payout.
            </p>
          ) : (
            transactions
              .slice(0, 6)
              .map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => router.push("/transactions")} />
              ))
          )}
        </div>
      </section>
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof HandCoins;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-elevated flex items-center gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-[18px]" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
