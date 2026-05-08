"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { api, FILE_BASE } from "@/lib/api";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";

interface PublicAppConfig {
  maintenance: {
    enabled: boolean;
    message: string;
  };
  update: {
    force: boolean;
    minAndroidVersion: string;
    latestVersion: string;
    downloadEnabled: boolean;
    downloadUrl?: string | null;
  };
  urls: {
    api?: string | null;
    publicWeb?: string | null;
    support: string;
  };
  native: {
    loadMode: "bundled" | "remote";
  };
}

export function AppConfigGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isNative = useIsNativeApp();
  const [config, setConfig] = useState<PublicAppConfig | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<PublicAppConfig>("/app/config", { retries: 2, timeoutMs: 8_000 })
      .then((data) => {
        if (!cancelled) {
          setConfig(data);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? "Could not load app config");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    import("@capacitor/app")
      .then(({ App }) => App.getInfo())
      .then((info) => {
        if (!cancelled) setAppVersion(info.version ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isNative]);

  const isAdmin = pathname?.startsWith("/admin");
  const mustUpdate = useMemo(() => {
    if (!config?.update.force || !isNative || !appVersion) return false;
    return compareVersions(appVersion, config.update.minAndroidVersion) < 0;
  }, [appVersion, config?.update.force, config?.update.minAndroidVersion, isNative]);

  if (config?.maintenance.enabled && !isAdmin) {
    return (
      <BlockingNotice
        title="Maintenance"
        message={config.maintenance.message}
        actionLabel="Check Again"
        onAction={() => setRefreshTick((n) => n + 1)}
      />
    );
  }

  if (mustUpdate && config) {
    const href = downloadHref(config.update.downloadUrl);
    const updateHref = config.update.downloadEnabled ? href ?? undefined : undefined;
    return (
      <BlockingNotice
        title="Update Required"
        message={`Please install v${config.update.latestVersion} or newer to continue.`}
        actionLabel={config.update.downloadEnabled && href ? "Download Update" : "Check Again"}
        href={updateHref}
        onAction={config.update.downloadEnabled && href ? undefined : () => setRefreshTick((n) => n + 1)}
      />
    );
  }

  return (
    <>
      {children}
      {isNative && error && (
        <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-lg border border-neon-orange/40 bg-bg/95 p-3 text-xs text-white shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="text-white/70">Connection issue: {error}</span>
            <button
              className="btn-outline text-[10px]"
              onClick={() => setRefreshTick((n) => n + 1)}
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function BlockingNotice({
  title,
  message,
  actionLabel,
  href,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel: string;
  href?: string;
  onAction?: () => void;
}) {
  const button = href ? (
    <a href={href} download className="btn-primary mt-5 w-full">
      <Download size={14} /> {actionLabel}
    </a>
  ) : (
    <button className="btn-primary mt-5 w-full" onClick={onAction}>
      <RefreshCw size={14} /> {actionLabel}
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="card w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan">
          <ShieldAlert size={22} />
        </div>
        <h1 className="font-display text-2xl text-white">{title}</h1>
        <p className="mt-3 text-sm text-white/65">{message}</p>
        {button}
      </div>
    </div>
  );
}

function downloadHref(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${FILE_BASE}${url.startsWith("/") ? url : `/${url}`}`;
}

function compareVersions(a: string, b: string) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

function parseVersion(value: string) {
  return value
    .split(/[+-]/)[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));
}
