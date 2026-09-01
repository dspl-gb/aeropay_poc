import type { Metadata } from "next";

import PreauthClient from "./preauth-client";

export const metadata: Metadata = {
  title: "Authorize a Payment",
  description:
    "Authorize a future payment — the merchant captures the funds later from your linked bank account.",
  openGraph: {
    title: "Authorize a Payment — AeroPay",
    description:
      "Authorize a future payment — the merchant captures the funds later from your linked bank account.",
  },
};

export default function PreauthPage() {
  return <PreauthClient />;
}
