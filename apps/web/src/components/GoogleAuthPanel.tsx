"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api, auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { InlineLoading } from "@/components/ui";

export function GoogleAuthPanel({
  title = "Continue with Google",
  next = "/dashboard",
  showReferral = false,
}: {
  title?: string;
  next?: string;
  showReferral?: boolean;
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  async function signIn(credential?: string) {
    if (!credential) {
      setErr("Google sign-in did not return a credential");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await api<any>("/auth/google", {
        method: "POST",
        body: JSON.stringify({
          credential,
          referralCode: showReferral ? referralCode.trim().toUpperCase() || undefined : undefined,
        }),
      });
      const nextToken =
        res?.token ?? res?.accessToken ?? res?.jwt ?? res?.data?.token;
      if (!nextToken) {
        throw new Error("Google sign-in succeeded but no auth token was returned");
      }
      auth.setToken(nextToken);
      await refresh();
      router.push(next);
    } catch (e: any) {
      setErr(e.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    // Retry check in case env was injected at build step; harmless on web
    if (clientId) return
    const id = setTimeout(() => {
      // no-op; process.env is static but keep for APK resilience
    }, 800)
    return () => clearTimeout(id)
  }, [clientId])

  return (
    <div className="card space-y-4">
      <div>
        <p className="label">Google Account Required</p>
        <h1 className="font-display text-2xl neon-text">{title}</h1>
        <p className="mt-2 text-sm text-white/60">
          Your Google account creates your FireSlot account automatically and
          keeps sign-in passwordless.
        </p>
      </div>
      {showReferral && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
          <label className="label">Referral code optional</label>
          <input
            className="input mt-2 font-mono uppercase tracking-[0.2em]"
            maxLength={6}
            placeholder="ABC123"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          />
          <p className="mt-2 text-xs text-amber-100/80">
            Paste a friend&apos;s 6 letters/digits code during first signup to get Rs 10. No multiple accounts.
          </p>
        </div>
      )}
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <div className="relative overflow-hidden rounded-md bg-white">
          <GoogleLogin
            width="100%"
            theme="filled_black"
            text="continue_with"
            onSuccess={(res) => signIn(res.credential)}
            onError={() => setErr("Google sign-in failed")}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <InlineLoading label="Signing you in..." />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-neon-orange/40 bg-neon-orange/10 px-3 py-6 text-sm text-neon-orange text-center">
          <div className="mb-2">Loading sign-in configuration...</div>
          <div className="text-xs text-white/60">If this persists, contact the app maintainer.</div>
        </div>
      )}
      {loading && <InlineLoading label="Finishing sign-in..." />}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
