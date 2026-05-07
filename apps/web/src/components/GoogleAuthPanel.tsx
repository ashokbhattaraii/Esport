"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, auth } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function GoogleAuthPanel({
  title = "Continue with Google",
  next = "/dashboard",
}: {
  title?: string;
  next?: string;
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(credential?: string) {
    if (!credential) {
      setErr("Google sign-in did not return a credential");
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      auth.setToken(res.token);
      await refresh();
      router.push(next);
    } catch (e: any) {
      setErr(e.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

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
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <div className="overflow-hidden rounded-md bg-white">
          <GoogleLogin
            width="100%"
            theme="filled_black"
            text="continue_with"
            onSuccess={(res) => signIn(res.credential)}
            onError={() => setErr("Google sign-in failed")}
          />
        </div>
      ) : (
        <p className="rounded-md border border-neon-orange/40 bg-neon-orange/10 px-3 py-2 text-sm text-neon-orange">
          Add NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable Google
          sign-in.
        </p>
      )}
      {loading && <p className="text-sm text-white/60">Signing you in...</p>}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
