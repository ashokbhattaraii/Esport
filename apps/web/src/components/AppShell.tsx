"use client";
import { useViewport } from "@/lib/viewport-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mode } = useViewport();
  return (
    <div className="mx-auto min-h-screen w-full" style={{ maxWidth: '480px', background: 'var(--fs-bg)' }}>
      {children}
    </div>
  );
}
