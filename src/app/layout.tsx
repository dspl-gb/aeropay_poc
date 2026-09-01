import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { PWARegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "AeroPay — Modern Payments Demo",
    template: "%s — AeroPay",
  },
  description: "AeroPay demo: send money, track transactions, and manage your balance.",
  applicationName: "AeroPay",
  openGraph: { type: "website" },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { rel: "icon", url: "/favicon.ico", type: "image/x-icon" },
      { rel: "icon", url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icons/icon-1024.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AeroPay",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3a36d6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body>
        {children}
        <Toaster richColors position="bottom-right" />
        <PWARegister />
      </body>
    </html>
  );
}
