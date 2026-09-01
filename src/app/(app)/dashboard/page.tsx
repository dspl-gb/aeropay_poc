import type { Metadata } from "next";

import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your AeroPay balance, quick actions, recent transactions, and payment activity.",
  openGraph: {
    title: "Dashboard — AeroPay",
    description: "Your AeroPay balance, quick actions, recent transactions, and payment activity.",
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
