"use client";
import { useViewport } from "@/lib/viewport-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useViewport();
  const cls =
    mode === "web"
      ? "mx-auto min-h-screen w-full max-w-7xl bg-bg"
      : "mx-auto min-h-screen w-full max-w-md border-x border-border bg-bg shadow-[0_0_80px_rgba(0,0,0,0.45)]";
  return <div className={cls}>{children}</div>;
}
