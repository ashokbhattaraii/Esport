import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Navbar } from "@/components/Navbar";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NativeBootstrap } from "@/components/NativeBootstrap";
import dynamic from 'next/dynamic'
import { RootClient } from '@/components/RootClient'

const ApkTestPanel = dynamic(() => import('@/components/admin/ApkTestPanel'), { ssr: false })

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {apiUrl && <link rel="preconnect" href={new URL(apiUrl).origin} crossOrigin="" />}
        {supaUrl && <link rel="preconnect" href={supaUrl} crossOrigin="" />}
        {supaUrl && <link rel="dns-prefetch" href={supaUrl} />}
      </head>
      <body>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            var isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
            if (!isNative && 'serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }
          `}
        </Script>
        <Providers>
          <NativeBootstrap />
          <AppShell>
            <Navbar />
            <RootClient>
              <main className="fs-page fs-pb-safe">
                {children}
              </main>
            </RootClient>
            <MobileBottomNav />
            <ApkTestPanel />
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
