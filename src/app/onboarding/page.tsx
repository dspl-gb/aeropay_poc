import type { Metadata } from "next";

import OnboardingClient from "./onboarding-client";

export const metadata: Metadata = {
  title: "Connect AeroPay",
  description: "Create your AeroPay user, verify MFA, and prepare bank linking.",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
