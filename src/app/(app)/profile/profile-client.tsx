"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CreditCard, Fingerprint, LogOut, Mail, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAeroPay, logout } from "@/lib/aeropay-store";

export default function ProfileClient() {
  const router = useRouter();
  const { user } = useAeroPay();
  const [settings, setSettings] = useState({
    notifications: true,
    biometric: true,
    marketing: false,
  });

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Your account details and preferences.</p>

      <section className="card-elevated mt-6 flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-[image:var(--gradient-brand)] text-xl font-bold text-primary-foreground">
          {user.initials || "?"}
        </span>
        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold">{user.name || "User"}</p>
          <p className="text-sm text-muted-foreground">
            Personal account{user.memberSince ? ` · since ${user.memberSince}` : ""}
          </p>
        </div>
        <Button variant="outline" className="rounded-xl sm:ml-auto">
          Edit profile
        </Button>
      </section>

      <section className="card-elevated mt-4 p-6">
        <h2 className="text-sm font-semibold">Contact details</h2>
        <div className="mt-4 space-y-3">
          <Field icon={Mail} label="Email" value={user.email || "Not set"} />
          <Field icon={Phone} label="Phone" value={user.phone || "Not set"} />
          <Field icon={CreditCard} label="Primary card" value="AeroPay Balance" />
        </div>
      </section>

      {/* <section className="card-elevated mt-4 p-6">
        <h2 className="text-sm font-semibold">Account settings</h2>
        <div className="mt-4 divide-y divide-border">
          <Toggle
            icon={Bell}
            label="Payment notifications"
            description="Get notified for every send and receipt."
            checked={settings.notifications}
            onChange={(v) => setSettings((s) => ({ ...s, notifications: v }))}
          />
          <Toggle
            icon={Fingerprint}
            label="Biometric unlock"
            description="Use Face ID to approve payments."
            checked={settings.biometric}
            onChange={(v) => setSettings((s) => ({ ...s, biometric: v }))}
          />
          <Toggle
            icon={ShieldCheck}
            label="Product updates"
            description="Occasional emails about new features."
            checked={settings.marketing}
            onChange={(v) => setSettings((s) => ({ ...s, marketing: v }))}
          />
        </div>
      </section> */}

      <Button
        variant="outline"
        className="mt-4 h-11 w-full rounded-xl text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
    </>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary p-3.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-surface text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
