import type { Metadata } from "next";

import SendClient from "./send-client";

export const metadata: Metadata = {
  title: "Send Money",
  description:
    "Make a standard payment from your linked bank account to the merchant in three steps.",
  openGraph: {
    title: "Send Money — AeroPay",
    description:
      "Make a standard payment from your linked bank account to the merchant in three steps.",
  },
};

export default function SendPage() {
  return <SendClient />;
}
