import type { Metadata } from "next";

import PayoutClient from "./payout-client";

export const metadata: Metadata = {
  title: "Receive a Payout",
  description: "Receive a payout from the merchant straight to your linked bank account.",
  openGraph: {
    title: "Receive a Payout — AeroPay",
    description: "Receive a payout from the merchant straight to your linked bank account.",
  },
};

export default function PayoutPage() {
  return <PayoutClient />;
}
