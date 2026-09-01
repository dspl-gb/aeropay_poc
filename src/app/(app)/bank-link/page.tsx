import type { Metadata } from "next";

import BankLinkClient from "./bank-link-client";

export const metadata: Metadata = {
  title: "Link your bank — AeroPay",
  description: "Securely connect your bank account to AeroPay via Aerosync.",
};

export default function BankLinkPage() {
  return <BankLinkClient />;
}
