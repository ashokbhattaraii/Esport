"use client";

import { GoogleAuthPanel } from "@/components/GoogleAuthPanel";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <GoogleAuthPanel title="Sign in to FireSlot" />
    </div>
  );
}
