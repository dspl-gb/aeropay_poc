"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Loader2,
  // Send,
  // ShieldCheck,
  HandCoins,
  Receipt,
  // User,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { AeroWordmark } from "./AeroLogo";
import { cn } from "@/lib/utils";
import { useAeroPay, initialize, logout } from "@/lib/aeropay-store";

const nav: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // { to: "/send", label: "Send Money", icon: Send },
  // { to: "/preauth", label: "Authorize", icon: ShieldCheck },
  { to: "/payout", label: "Payout", icon: HandCoins },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  // { to: "/profile", label: "Profile", icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAeroPay();

  useEffect(() => {
    void initialize();
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <AeroWordmark size={36} />
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const displayName = user.name || user.firstName || "Account";
  const displayEmail = user.email || "";
  const initials = user.initials || displayEmail[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar px-5 py-6 lg:flex">
        <Link href="/dashboard" className="flex w-full justify-center px-1">
          <AeroWordmark />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              href={to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === to
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-xs font-semibold text-foreground">Sandbox mode</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Supabase auth · AeroPay sandbox · No real money moves here.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur md:px-8">
          <Link href="/dashboard" className="lg:hidden">
            <AeroWordmark size={30} />
          </Link>
          <span className="hidden text-sm text-muted-foreground lg:block">
            Personal account · USD
          </span>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {initials}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-8 md:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            href={to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              pathname === to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
