"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/lib/auth-context";
import { ViewportProvider } from "@/lib/viewport-context";
import { ToastProvider } from "@/lib/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <ViewportProvider>
          <ToastProvider>{children}</ToastProvider>
        </ViewportProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
