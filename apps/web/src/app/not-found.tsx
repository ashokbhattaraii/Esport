import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">🎮</div>
      <h1 className="mt-4 font-display text-2xl text-white">Page Not Found</h1>
      <p className="mt-2 text-sm text-white/60">
        This page doesn't exist or was moved.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Go Home
      </Link>
    </div>
  );
}
