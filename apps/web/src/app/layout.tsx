import "./globals.css";
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NativeBootstrap } from "@/components/NativeBootstrap";

export const metadata: Metadata = {
  title: "FireSlot Nepal — Free Fire Tournaments",
  description:
    "Join paid Free Fire tournaments in NPR. Compete. Win. Withdraw.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html lang="en" className="dark">
      <head>
        {apiUrl && <link rel="preconnect" href={new URL(apiUrl).origin} crossOrigin="" />}
        {supaUrl && <link rel="preconnect" href={supaUrl} crossOrigin="" />}
        {supaUrl && <link rel="dns-prefetch" href={supaUrl} />}
      </head>
      <body>
        <Providers>
          <NativeBootstrap />
          <AppShell>
            <Navbar />
            <main className="min-h-[calc(100vh-132px)] px-4 pb-28 pt-4">
              {children}
            </main>
            <MobileBottomNav />
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
