import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Header from "./components/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VideoAssetForge - AI Video Asset Generator",
  description:
    "Generate PNG overlays and timeline data from video scripts and audio using AI",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (!isLocalhost) {
    const { getAccessToken, isAuthenticated } = getKindeServerSession();

    const isAuth = await isAuthenticated();
    if (!isAuth) {
      // Proxy handles redirect, this is a backup
    }

    // Kill switch: ping Kinde's live API on every page load
    const token = await getAccessToken();
    if (token) {
      try {
        const liveCheck = await fetch(
          `${process.env.KINDE_ISSUER_URL}/oauth2/v2/user_profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
            next: { revalidate: 0 },
          }
        );

        if (!liveCheck.ok) {
          redirect("/api/auth/logout");
        }
      } catch (e) {
        // If Kinde is unreachable, allow user to stay (fail-open)
      }
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
      </body>
    </html>
  );
}
