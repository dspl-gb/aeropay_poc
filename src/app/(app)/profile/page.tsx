import type { Metadata } from "next";

import ProfileClient from "./profile-client";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your AeroPay profile details, notifications, and account settings.",
  openGraph: {
    title: "Profile — AeroPay",
    description: "Manage your AeroPay profile details, notifications, and account settings.",
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
