"use client";
import { Monitor, Smartphone } from "lucide-react";
import { useViewport } from "@/lib/viewport-context";

export function ViewportToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useViewport();
  if (compact) {
    return (
      <button
        onClick={() => setMode(mode === "web" ? "mobile" : "web")}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface"
        aria-label={`Switch to ${mode === "web" ? "mobile" : "web"} view`}
        title={`Switch to ${mode === "web" ? "Mobile" : "Web"} View`}
      >
        {mode === "web" ? <Monitor size={16} /> : <Smartphone size={16} />}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-surface p-0.5 text-xs">
      <button
        onClick={() => setMode("web")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 ${
          mode === "web" ? "bg-neon text-black" : "text-white/70"
        }`}
      >
        <Monitor size={12} /> Web
      </button>
      <button
        onClick={() => setMode("mobile")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 ${
          mode === "mobile" ? "bg-neon text-black" : "text-white/70"
        }`}
      >
        <Smartphone size={12} /> Mobile
      </button>
    </div>
  );
}
