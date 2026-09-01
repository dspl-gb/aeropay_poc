import type { Metadata } from "next";

import TransactionsClient from "./transactions-client";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Search, filter, and inspect every payment sent and received on AeroPay.",
  openGraph: {
    title: "Transactions — AeroPay",
    description: "Search, filter, and inspect every payment sent and received on AeroPay.",
  },
};

export default function TransactionsPage() {
  return <TransactionsClient />;
}
