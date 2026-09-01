import type { Metadata } from "next";

import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to AeroPay to send money, review transactions, and track your balance.",
  openGraph: {
    title: "Sign in — AeroPay",
    description: "Sign in to AeroPay to send money, review transactions, and track your balance.",
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
